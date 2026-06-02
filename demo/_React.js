import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function UserProfile({ userId }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchUser = async () => {
      const response = await axios.get(\`/api/users/\${userId}\`)
      setUser(response.data)
      setLoading(false)
    }
    fetchUser()
  }, [userId])
  
  const handleSave = () => {
    // Save user logic
  }
  
  return (
    <div>
      {loading ? <p>Loading...</p> : <div>{user?.name}</div>}
    </div>
  )
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString()
}