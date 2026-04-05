import pyotp
import qrcode
from io import BytesIO
import base64
from fastapi import HTTPException
from ..repositories.user_repo import UserRepository


class TwoFAService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    async def setup_2fa(self, user_email: str):
        """
        Setup 2FA for user - generate TOTP secret and QR code
        """
        # Generate a random secret
        secret = pyotp.random_base32()
        
        # Create TOTP object with the secret
        totp = pyotp.TOTP(secret)
        
        # Generate provisioning URI for QR code
        provisioning_uri = totp.provisioning_uri(
            name=user_email,
            issuer_name="AuctionApp"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        # Convert QR code to image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert image to base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        qr_code_data_url = f"data:image/png;base64,{qr_code_base64}"
        
        return {
            "secret": secret,
            "qr_code": qr_code_data_url,
            "manual_entry_key": secret  # For manual entry if QR code scan fails
        }
    
    async def verify_2fa_setup(self, user_email: str, code: str, secret: str):
        """
        Verify the 2FA setup code
        Returns True if valid, raises HTTPException if invalid
        """
        totp = pyotp.TOTP(secret)
        print(totp.now())  # Debug: print current TOTP code
        
        # Verify the code (allow ±1 time window for clock skew)
        if not totp.verify(code, valid_window=1):
            raise HTTPException(
                status_code=400,
                detail="Invalid verification code. Please try again."
            )
        
        return True
    
    async def enable_2fa(self, user_email: str, secret: str):
        """
        Enable 2FA for user by saving the secret to database
        """
        user = await self.user_repo.get_user_by_email(user_email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user with 2FA secret and enable flag
        user.totp_secret = secret
        user.is_enabled_2fa = True
        
        await self.user_repo.update_user(user)
        
        return {
            "message": "2FA has been successfully enabled",
            "is_enabled_2fa": True
        }
    
    async def disable_2fa(self, user_email: str):
        """
        Disable 2FA for user
        """
        user = await self.user_repo.get_user_by_email(user_email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.totp_secret = None
        user.is_enabled_2fa = False
        
        await self.user_repo.update_user(user)
        
        return {
            "message": "2FA has been disabled",
            "is_enabled_2fa": False
        }
    
    async def verify_totp_code(self, user_email: str, code: str):
        """
        Verify TOTP code during login
        """
        user = await self.user_repo.get_user_by_email(user_email)
        if not user or not user.totp_secret:
            raise HTTPException(status_code=404, detail="2FA not enabled")
        
        totp = pyotp.TOTP(user.totp_secret)
        print(totp.now())  # Debug: print current TOTP code
        if not totp.verify(code, valid_window=1):
            raise HTTPException(
                status_code=400,
                detail="Invalid verification code"
            )
        
        return True
