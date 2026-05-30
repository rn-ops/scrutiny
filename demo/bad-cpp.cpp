// Demo: Common C++ security mistakes

#include <iostream>
#include <string>
#include <cstdlib>
#include <cstring>

// ❌ Hardcoded API keys and passwords
const std::string API_KEY = "sk_live_abcdefghij1234567890";
const std::string DB_PASSWORD = "SuperSecretPassword123!";

// ❌ Buffer overflow with C-style strings
void getUserName(char* buffer) {
    std::cin >> buffer;  // No size limit!
}

// ❌ Command injection via system()
void executeDiskCheck(const std::string& drive) {
    std::string cmd = "diskutil secureEmpty " + drive;
    system(cmd.c_str());  // User input in shell command!
}

// ❌ Use of deprecated and unsafe functions
void copyData(const char* source) {
    char dest[128];
    strcpy(dest, source);  // Unsafe! No bounds checking
}

// ❌ SQL injection via string concatenation
std::string buildQuery(const std::string& userId) {
    return "SELECT * FROM users WHERE id = '" + userId + "'";
}

// ❌ Weak random for security
#include <ctime>
std::string generateToken() {
    srand(time(nullptr));
    std::string token;
    for (int i = 0; i < 32; i++) {
        token += std::to_string(rand() % 10);
    }
    return token;
}

// ❌ Memory leak and dangling pointer
int* allocateValue() {
    int* ptr = new int(42);
    // Missing: delete ptr; 
    return ptr;
}

// ❌ Unvalidated user input in file operations
void readUserFile(const std::string& filename) {
    std::string path = "/var/data/" + filename;
    // Direct file access without validation - path traversal!
}

// ❌ Exception safety issues
void processTransaction(double amount) {
    double* balance = new double(1000.0);
    *balance -= amount;
    // If an exception is thrown here, memory leaks!
    delete balance;
}

// ❌ Integer overflow
uint32_t calculateTotal(uint32_t a, uint32_t b) {
    return a + b;  // Can overflow!
}

int main() {
    char buffer[50];
    getUserName(buffer);
    
    std::string userInput;
    std::getline(std::cin, userInput);
    executeDiskCheck(userInput);
    
    return 0;
}
