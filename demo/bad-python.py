# Demo: Common Python security mistakes

import os
import pickle
import subprocess

# ❌ Hardcoded credentials
AWS_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE'
AWS_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
DATABASE_URL = 'postgresql://admin:password123@localhost/mydb'

# ❌ SQL injection via string concatenation
def get_user_by_id(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    # execute_query(query)
    return query

# ❌ OS command injection
def scan_directory(user_path):
    os.system(f"ls -la {user_path}")

def process_file(filename):
    subprocess.call(f"cat {filename}", shell=True)

# ❌ Unsafe deserialization
def load_user_data(data):
    return pickle.loads(data)

# ❌ Weak random for security purposes
import random
def generate_otp():
    return str(random.randint(100000, 999999))

# ❌ Hardcoded API keys in function
def call_stripe_api(amount):
    api_key = 'sk_live_51234567890abcdefghij'
    # stripe.Charge.create(amount=amount, api_key=api_key)
    return api_key

# ❌ Missing input validation
def execute_search(query):
    results = eval(query)
    return results

if __name__ == '__main__':
    print("Bad Python patterns loaded")
