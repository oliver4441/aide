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
            Result.failure(Exception(e.message ?: "Authentication failed"))
        }
    }

    fun logout() {
        sessionManager.clearSession()
    }

    fun isLoggedIn(): Boolean = sessionManager.isLoggedIn()
    fun getActiveBusinessId(): String? = sessionManager.getBusinessId()
    fun getUserName(): String? = sessionManager.getUserName()
}
