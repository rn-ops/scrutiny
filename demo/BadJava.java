// Demo: Common Java security mistakes

import java.io.*;
import java.sql.*;
import java.util.*;

public class BadJava {
    
    // ❌ Hardcoded credentials
    static final String DB_URL = "jdbc:mysql://localhost:3306/mydb";
    static final String DB_USER = "root";
    static final String DB_PASSWORD = "password123";
    static final String API_KEY = "sk_live_1234567890abcdefghij";
    
    // ❌ SQL injection via string concatenation
    public String getUserById(String userId) {
        return "SELECT * FROM users WHERE id = '" + userId + "'";
        // connection.executeQuery(query);
    }
    
    // ❌ Command injection via Runtime.exec()
    public void executeSystemCommand(String filename) throws IOException {
        Runtime.getRuntime().exec("rm -rf " + filename);
    }
    
    // ❌ Unsafe deserialization
    public Object deserializeUserData(byte[] data) throws IOException, ClassNotFoundException {
        ByteArrayInputStream bais = new ByteArrayInputStream(data);
        ObjectInputStream ois = new ObjectInputStream(bais);
        return ois.readObject();  // Can execute arbitrary code!
    }
    
    // ❌ Weak random for security-sensitive operations
    public String generateSession() {
        Random random = new Random();
        return String.valueOf(random.nextLong());
    }
    
    // ❌ Path traversal vulnerability
    public void readUserFile(String filename) throws IOException {
        File file = new File("/uploads/" + filename);
        // FileReader reader = new FileReader(file); // No validation!
    }
    
    // ❌ Unvalidated redirects
    public String redirectUser(String url) {
        return "redirect:" + url;  // No whitelist validation
    }
    
    // ❌ XSS vulnerability via unescaped output
    public String displayUserComment(String comment) {
        return "<div>" + comment + "</div>";  // HTML injection!
    }
    
    // ❌ Resource leak
    public String readFile(String filename) throws IOException {
        FileReader reader = new FileReader(filename);
        BufferedReader buffered = new BufferedReader(reader);
        String line = buffered.readLine();
        // Missing: buffered.close(); reader.close();
        return line;
    }
    
    // ❌ Null pointer exception risk
    public int getUserAge(String userId) {
        Map<String, Integer> users = getUserMap();
        return users.get(userId);  // Can throw NPE if key not found
    }
    
    // ❌ Weak password hashing
    public String hashPassword(String password) {
        return Integer.toString(password.hashCode());  // Terrible hash!
    }
    
    private Map<String, Integer> getUserMap() {
        return new HashMap<>();
    }
}
