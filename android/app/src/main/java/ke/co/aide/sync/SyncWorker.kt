package ke.co.aide.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import ke.co.aide.data.local.AideDatabase
import ke.co.aide.data.remote.api.AideApiService
import ke.co.aide.data.remote.auth.SessionManager
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AideDatabase.getDatabase(applicationContext)
        val sessionManager = SessionManager(applicationContext)

        val json = Json { ignoreUnknownKeys = true }
        val retrofit = Retrofit.Builder()
            .baseUrl("https://aide.omixsystems.store")
            .client(OkHttpClient())
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

        val apiService = retrofit.create(AideApiService::class.java)

        val syncEngine = SyncEngine(
            context = applicationContext,
            apiService = apiService,
            productDao = database.productDao(),
            categoryDao = database.categoryDao(),
            saleDao = database.saleDao(),
            syncMutationDao = database.syncMutationDao(),
            sessionManager = sessionManager
        )

        val syncResult = syncEngine.performSync()
        return if (syncResult.isSuccess) {
            Result.success()
        } else {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
