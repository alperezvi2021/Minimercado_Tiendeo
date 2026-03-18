import subprocess
import sys

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    import pypdf
except ImportError:
    install('pypdf')
    import pypdf

def read_pdf(file_path):
    try:
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            print(f"=== {file_path} ===")
            print(text)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

read_pdf(r"C:\Proyecto MiniMercado\Proyecto\arquitectura_pro.pdf")
read_pdf(r"C:\Proyecto MiniMercado\Proyecto\enfoque_pro.pdf")
