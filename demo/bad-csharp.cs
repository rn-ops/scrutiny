// Demo: Common C# security mistakes

using System;
using System.Data.SqlClient;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;

public class BadCSharpDemo {
    
    // ❌ Hardcoded credentials in code
    private static string ConnectionString = "Server=localhost;User Id=sa;Password=AdminPassword123;Database=MyApp";
    private static string EncryptionKey = "MySecretKey2024";
    
    // ❌ SQL injection via string concatenation
    public string GetUserQuery(string userId) {
        return $"SELECT * FROM Users WHERE UserId = '{userId}'";
        // using (SqlCommand cmd = new SqlCommand(query, connection)) { ... }
    }
    
    // ❌ Command injection
    public void ExecuteBackup(string backupName) {
        ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", $"/c backup.exe {backupName}");
        Process.Start(psi);  // User input in command!
    }
    
    // ❌ Weak random for security purposes
    public string GenerateToken() {
        Random random = new Random();
        return random.Next(0, 999999).ToString("D6");
    }
    
    // ❌ Unsafe deserialization
    public object DeserializeData(string jsonData) {
        var settings = new System.Web.Script.Serialization.JavaScriptSerializer();
        return settings.DeserializeObject(jsonData);
    }
    
    // ❌ Path traversal vulnerability
    public string ReadUserFile(string filename) {
        string path = Path.Combine("/app/uploads", filename);
        return File.ReadAllText(path);  // No validation against path traversal!
    }
    
    // ❌ Hardcoded JWT secret
    public string GenerateJwt(string userId) {
        var secret = "ThisIsMySecretKeyDontShareIt2024";
        // var token = JwtBuilder.Create()
        //     .WithSecret(secret)
        //     .AddClaim("sub", userId)
        //     .Encode();
        return secret;
    }
    
    // ❌ Unvalidated file upload
    public void HandleFileUpload(string filename, byte[] fileData) {
        string path = Path.Combine("/var/uploads", filename);
        File.WriteAllBytes(path, fileData);  // No extension/size validation!
    }
    
    // ❌ XSS vulnerability in MVC view
    public string RenderUserComment(string comment) {
        return $"<div class=\"comment\">{comment}</div>";  // HTML injection!
    }
    
    // ❌ Resource leak - missing using statement
    public string ReadLargeFile(string filePath) {
        StreamReader reader = new StreamReader(filePath);
        string content = reader.ReadToEnd();
        // Missing: reader.Dispose();
        return content;
    }
    
    // ❌ Unvalidated external URL redirect
    public string RedirectToUrl(string returnUrl) {
        return $"redirect:{returnUrl}";  // No whitelist!
    }
    
    // ❌ Weak encryption - hardcoded IV
    public string EncryptData(string data) {
        string iv = "1234567890123456";  // Fixed IV - reduces security!
        // Using AES with hardcoded IV...
        return data;
    }
}
