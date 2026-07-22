import qrcode
import json
import base64
from io import BytesIO


def generer_qr_code_base64(data: dict) -> str:
    json_data = json.dumps(data, ensure_ascii=False)
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(json_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()
