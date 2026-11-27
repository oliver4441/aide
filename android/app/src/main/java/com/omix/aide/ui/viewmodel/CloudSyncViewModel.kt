package com.omix.aide.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.omix.aide.data.local.CloudSessionStore
import com.omix.aide.data.local.dao.SyncDao
import com.omix.aide.data.sync.SyncEngine
import com.omix.aide.work.AideWorkScheduler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CloudSyncUiState(
    val linked: Boolean = false,
    val email: String = "",
    val baseUrl: String = "",
    val lastSyncAt: String? = null,
    val autoSync: Boolean = true,
    val pending: Int = 0,
    val busy: Boolean = false,
    val message: String? = null,
    val error: String? = null
)

/**
 * Drives the Cloud sync screen: sign in, manual sync, and disconnect.
 *
 * The account rules live in [SyncEngine]; this class only owns the form state
 * and the user-facing outcome so the screen stays a rendering layer.
 */
class CloudSyncViewModel(
    private val engine: SyncEngine,
    private val sessionStore: CloudSessionStore,
    private val appContext: Context,
    syncDao: SyncDao
) : ViewModel() {

    private val _uiState = MutableStateFlow(snapshot())
    val uiState: StateFlow<CloudSyncUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            syncDao.pendingCount().collect { count ->
                _uiState.update { it.copy(pending = count) }
            }
        }
    }

    fun connect(
        rawBaseUrl: String,
        email: String,
        password: String,
        onBusinessChanged: () -> Unit
    ) {
        if (_uiState.value.busy) return
        if (email.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(error = "Enter the email and password for your Aide account") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(busy = true, error = null, message = null) }
            try {
                val result = engine.connect(rawBaseUrl, email, password)
                refresh()
                _uiState.update {
                    it.copy(
                        busy = false,
                        message = if (result.outcome.ok) result.outcome.summary else null,
                        error = if (result.outcome.ok) null else result.outcome.summary
                    )
                }
                if (result.outcome.ok) {
                    AideWorkScheduler.scheduleCloudSync(appContext)
                    AideWorkScheduler.syncNow(appContext)
                }
                if (result.businessChanged) onBusinessChanged()
            } catch (err: Exception) {
                _uiState.update {
                    it.copy(
                        busy = false,
                        error = err.message ?: "Could not connect to Aide Cloud"
                    )
                }
            }
        }
    }

    fun syncNow() {
        if (_uiState.value.busy) return
        viewModelScope.launch {
            _uiState.update { it.copy(busy = true, error = null, message = null) }
            val outcome = engine.syncNow()
            refresh()
            _uiState.update {
                it.copy(
                    busy = false,
                    message = if (outcome.ok) outcome.summary else null,
                    error = if (outcome.ok) null else outcome.summary
                )
            }
        }
    }

    fun setAutoSync(enabled: Boolean) {
        sessionStore.setAutoSync(enabled)
        if (enabled) {
            AideWorkScheduler.scheduleCloudSync(appContext)
            AideWorkScheduler.syncNow(appContext)
        } else {
            AideWorkScheduler.cancelCloudSync(appContext)
        }
        refresh()
    }

    fun disconnect() {
        if (_uiState.value.busy) return
        viewModelScope.launch {
            _uiState.update { it.copy(busy = true, error = null, message = null) }
            engine.disconnect()
            AideWorkScheduler.cancelCloudSync(appContext)
            refresh()
            _uiState.update {
                it.copy(
                    busy = false,
                    message = "Signed out. Your local data stays on this phone.",
                    error = null
                )
            }
        }
    }

    fun dismissMessage() {
        _uiState.update { it.copy(message = null, error = null) }
    }

    private fun refresh() {
        val session = sessionStore.read()
        _uiState.update {
            it.copy(
                linked = session?.isLinked == true,
                email = session?.email ?: "",
                baseUrl = session?.baseUrl ?: sessionStore.defaultBaseUrl(),
                lastSyncAt = session?.lastSyncAt,
                autoSync = session?.autoSync ?: true
            )
        }
    }

    private fun snapshot(): CloudSyncUiState {
        val session = sessionStore.read()
        return CloudSyncUiState(
            linked = session?.isLinked == true,
            email = session?.email ?: "",
            baseUrl = session?.baseUrl ?: sessionStore.defaultBaseUrl(),
            lastSyncAt = session?.lastSyncAt,
            autoSync = session?.autoSync ?: true
        )
    }
}
