import smtplib
from email.message import EmailMessage

def send_verification_email(to_email, token):
    msg = EmailMessage()
    
    # ✅ Set proper subject
    msg["Subject"] = "Welcome to Stratify! Please Verify Your Email"
    
    # ✅ Set From name as "Stratify" (not just the Gmail address)
    msg["From"] = "Stratify"  
    
    msg["To"] = to_email

    # ✅ Plain-text body (simple version)
    body = f"""
Hi there,

Thanks for signing up for Stratify! 🚀

Please verify your email by clicking the link below:
👉 http://localhost:5001/api/verify/{token}

If you didn't request this, you can safely ignore this message.

Thanks,  
The Stratify Team
"""
    msg.set_content(body)

    # ✅ Send email via Gmail SMTP
    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.starttls()
        smtp.login("srichaitan26@gmail.com", "enmb lrjd xoxf hryi")  # App password
        smtp.send_message(msg)

def send_reset_email(to_email, reset_link):
    msg = EmailMessage()
    msg["Subject"] = "Stratify Password Reset"
    msg["From"] = "Stratify"
    msg["To"] = to_email
    body = f"""
Hi there,

We received a request to reset your Stratify password.

Click the link below to reset your password:
👉 {reset_link}

If you didn't request this, you can safely ignore this message.

Thanks,
The Stratify Team
"""
    msg.set_content(body)
    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.starttls()
        smtp.login("srichaitan26@gmail.com", "enmb lrjd xoxf hryi")  # App password
        smtp.send_message(msg)
