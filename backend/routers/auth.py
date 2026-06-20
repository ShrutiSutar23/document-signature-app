from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.user import UserRegister, UserLogin, UserResponse
from services.auth import hash_password, verify_password, create_access_token
from services.audit_service import log_action
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register(request: Request, user: UserRegister, db: Session = Depends(get_db)):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password and save user
    new_user = User(
        name=user.name,
        email=user.email,
        password=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log action
    log_action(
        db,
        action="user_registered",
        user_id=new_user.id,
        details=f"New user registered: {user.email}",
        ip_address=request.client.host
    )

    return new_user

@router.post("/login")
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    # Find user by email
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password
    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Log action
    log_action(
        db,
        action="user_login",
        user_id=db_user.id,
        details=f"User logged in: {db_user.email}",
        ip_address=request.client.host
    )

    # Generate JWT token
    token = create_access_token(data={"sub": db_user.email, "user_id": db_user.id, "name": db_user.name})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user