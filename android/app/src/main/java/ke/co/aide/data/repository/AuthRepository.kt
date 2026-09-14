package ke.co.aide.data.repository

import ke.co.aide.data.remote.api.AideApiService
import ke.co.aide.data.remote.auth.SessionManager
import ke.co.aide.data.remote.dto.LoginRequestDto
import ke.co.aide.data.remote.dto.UserDto

class AuthRepository(
    private val apiService: AideApiService,
    private val sessionManager: SessionManager
) {
    suspend fun login(email: String, password: String): Result<UserDto> {
        return try {
            val response = apiService.login(LoginRequestDto(email, password))
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                sessionManager.saveSession(
                    token = user.id,
                    userId = user.id,
                    businessId = user.businessId,
                    userEmail = user.email,
                    userName = user.name
                )
                Result.success(user)
            } else {
                Result.failure(Exception("Invalid email or password"))
            }
        } catch (e: Exception) {
            // Offline fallback for demo / test credentials if matches
            if (email == "oliver@aide.co.ke" && password == "password123") {
                val demoUser = UserDto(
                    id = "user-oliver-1",
                    email = "oliver@aide.co.ke",
                    name = "Oliver",
                    role = "OWNER",
                    businessId = "bus-demo-1"
                )
                sessionManager.saveSession(
                    token = demoUser.id,
                    userId = demoUser.id,
                    businessId = demoUser.businessId,
                    userEmail = demoUser.email,
                    userName = demoUser.name
                )
                Result.success(demoUser)
            } else {
                Result.failure(Exception(e.message ?: "Authentication failed"))
            }
        }
    }

    fun logout() {
        sessionManager.clearSession()
    }

    fun isLoggedIn(): Boolean = sessionManager.isLoggedIn()
    fun getActiveBusinessId(): String? = sessionManager.getBusinessId()
    fun getUserName(): String? = sessionManager.getUserName()
}
