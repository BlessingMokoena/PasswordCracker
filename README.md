# PasswordCracker
This Python script demonstrates the process of password cracking using two primary techniques: dictionary attacks and brute-force attacks with multiprocessing. It allows users to simulate the cracking of hashed passwords and observe the performance and effectiveness of each method.

**Features**

*Dictionary Attack*

Attempts to match the hashed password against a predefined list of common passwords and their variations (e.g., capitalized forms, appended digits).

*Brute-Force Attack with Multiprocessing*

Performs an exhaustive search by generating and testing all possible character combinations up to a specified length. This process is parallelized across all available CPU cores to improve efficiency.

 **How It Works**
 
The user provides a target password.

The password is hashed using the SHA-256 algorithm.

The script first attempts to crack the hash using a dictionary attack.

If unsuccessful, it proceeds with a parallelized brute-force attack.

Upon completion, the script displays:

The cracked password (if successful)

The method used

Total number of attempts

Time taken to crack the password

**Configuration Options**

Maximum brute-force length: User-defined (range: 4 to 6 characters).

**Character set options:**

simple: Lowercase letters and digits

full: Uppercase/lowercase letters, digits, and punctuation symbols


