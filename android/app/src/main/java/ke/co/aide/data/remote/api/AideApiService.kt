package ke.co.aide.data.remote.api

import ke.co.aide.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface AideApiService {

    @POST("/api/auth/callback/credentials")
    suspend fun login(
        @Body request: LoginRequestDto
    ): Response<UserDto>

    @POST("/api/sync")
    suspend fun pushSync(
        @Body request: SyncPushRequestDto
    ): Response<SyncPushResponseDto>

    @GET("/api/sync")
    suspend fun pullSync(
        @Query("businessId") businessId: String,
        @Query("since") since: String = "0"
    ): Response<SyncPullResponseDto>
}
