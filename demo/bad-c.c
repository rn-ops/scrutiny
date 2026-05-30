// Demo: Common C security mistakes

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// ❌ Buffer overflow vulnerability
void getUserInput(char *buffer) {
    scanf("%s", buffer);  // No length limit!
}

// ❌ Hardcoded credentials
const char *api_key = "sk-1234567890abcdefghijklmnop";
const char *db_password = "admin_password_2024";

// ❌ Format string vulnerability
void printUserMessage(char *user_input) {
    printf(user_input);  // User input as format string!
}

// ❌ Stack buffer overflow
void copyString(const char *source) {
    char buffer[64];
    strcpy(buffer, source);  // No bounds checking!
}

// ❌ Use-after-free
int* allocateNumber() {
    int local = 42;
    return &local;  // Returning pointer to stack variable!
}

// ❌ Integer overflow
void processAmount(unsigned int amount) {
    unsigned int total = amount + 1000000;  // Can overflow
    printf("Total: %u\n", total);
}

// ❌ Command execution vulnerability
void executeUserCommand(const char *cmd) {
    system(cmd);  // Direct shell execution!
}

// ❌ Weak random for cryptography
#include <time.h>
void generateSecret(char *secret) {
    srand(time(NULL));
    for (int i = 0; i < 16; i++) {
        secret[i] = rand() % 256;
    }
}

// ❌ SQL injection (if using SQLite or similar)
void queryUser(const char *username) {
    char query[256];
    sprintf(query, "SELECT * FROM users WHERE name='%s'", username);
    // sqlite3_exec(db, query, ...);
}

int main() {
    char user_data[50];
    getUserInput(user_data);
    copyString(user_data);
    return 0;
}
