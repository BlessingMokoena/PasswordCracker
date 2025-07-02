import hashlib
import itertools
import string
import time
import os
from multiprocessing import Pool, cpu_count

COMMON_PASSWORDS = [
    "password", "123456", "qwerty", "admin", "letmein", "welcome", "pass123", "password1"
]

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def mangled_words(word):
    yield word
    yield word.capitalize()
    yield word.upper()
    for digit in range(10):
        yield f"{word}{digit}"
        yield f"{word.capitalize()}{digit}"
        yield f"{word.upper()}{digit}"

def dictionary_attack(hash_to_crack):
    print(" Trying dictionary attack...")
    start = time.time()
    attempts = 0

    for word in COMMON_PASSWORDS:
        for variant in mangled_words(word):
            attempts += 1
            if hash_password(variant) == hash_to_crack:
                elapsed = time.time() - start
                return variant, "Dictionary", attempts, elapsed
    return None, "Dictionary", attempts, time.time() - start

def brute_force_worker(args):
    charset, length, hash_to_crack, worker_id, total_workers = args
    attempts = 0
    for idx, combo in enumerate(itertools.product(charset, repeat=length)):
        if idx % total_workers != worker_id:
            continue
        guess = ''.join(combo)
        attempts += 1
        if hash_password(guess) == hash_to_crack:
            return guess, attempts
    return None, attempts

def brute_force_attack_parallel(hash_to_crack, max_length=5, charset=None):
    if charset is None:
        charset = string.ascii_letters + string.digits + "!@#$%"

    print(" Trying brute-force attack (multiprocessing)...")
    start_time = time.time()
    total_attempts = 0
    num_workers = cpu_count()
    pool = Pool(num_workers)

    for length in range(1, max_length + 1):
        args = [(charset, length, hash_to_crack, worker_id, num_workers) for worker_id in range(num_workers)]
        results = pool.map(brute_force_worker, args)

        for guess, attempts in results:
            total_attempts += attempts
            if guess is not None:
                pool.terminate()
                elapsed = time.time() - start_time
                return guess, "Brute Force (Multiprocessing)", total_attempts, elapsed

    pool.close()
    pool.join()
    elapsed = time.time() - start_time
    return None, "Brute Force (Multiprocessing)", total_attempts, elapsed

def get_charset(name="full"):
    if name == "simple":
        return string.ascii_lowercase + string.digits
    elif name == "full":
        return string.ascii_letters + string.digits + string.punctuation
    else:
        raise ValueError("Invalid charset name")

def simulate_crack(target_password, max_length=5, charset_type="full"):
    print(f"\n Target password: {target_password}")
    hash_val = hash_password(target_password)
    print(f" Hashed (SHA-256): {hash_val}\n")

    # Dictionary attack
    result, method, attempts, time_taken = dictionary_attack(hash_val)
    if result:
        print(f" Cracked using {method} in {attempts} attempts and {time_taken:.2f} seconds: '{result}'")
        return

    # Brute-force attack
    charset = get_charset(charset_type)
    result, method, attempts, time_taken = brute_force_attack_parallel(hash_val, max_length=max_length, charset=charset)
    if result:
        print(f" Cracked using {method} in {attempts} attempts and {time_taken:.2f} seconds: '{result}'")
    else:
        print(f" Failed to crack the password within max length {max_length}.")

if __name__ == "__main__":
    print(" Password Cracking Simulator ")
    print("--------------------------------------------------")
    pwd = input("Enter a password to simulate cracking: ").strip()

    while True:
        try:
            length = int(input("Max brute-force length (4-6): "))
            if 4 <= length <= 6:
                break
            else:
                print("Please enter a number between 4 and 6.")
        except ValueError:
            print("Invalid input. Please enter a number.")

    while True:
        charset_type = input("Charset ('simple' or 'full'): ").strip().lower()
        if charset_type in ("simple", "full"):
            break
        else:
            print("Invalid charset. Choose 'simple' or 'full'.")

    simulate_crack(pwd, max_length=length, charset_type=charset_type)
