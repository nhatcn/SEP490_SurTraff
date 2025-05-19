import smtplib
from email.message import EmailMessage

def send_email_with_password(to_email: str, new_password: str):
    msg = EmailMessage()
    msg["Subject"] = "Your New Password"
    msg["From"] = "ngminhnhat24@gmail.com"
    msg["To"] = to_email
    msg.set_content(f"Your new password is: {new_password}\nPlease login and change it immediately.")

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.starttls()
        smtp.login("ngminhnhat24@gmail.com", "iczt jtwr qwgn gcxd")
        smtp.send_message(msg)
