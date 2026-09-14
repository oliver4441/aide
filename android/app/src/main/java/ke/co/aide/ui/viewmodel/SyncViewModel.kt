package ke.co.aide.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ke.co.aide.data.local.entities.SyncMutationEntity
import ke.co.aide.sync.SyncEngine
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class SyncUiState(
    val pendingMutations: List<SyncMutationEntity> = emptyList(),
    val isSyncing: Boolean = false,
    val lastSyncMessage: String? = null
)

class SyncViewModel(
    private val syncEngine: SyncEngine
) : ViewModel() {

    private val _isSyncing = MutableStateFlow(false)
    private val _lastMessage = MutableStateFlow<String?>(null)

    val uiState: StateFlow<SyncUiState> = combine(
        syncEngine.pendingMutationsFlow,
        _isSyncing,
        _lastMessage
    ) { mutations, syncing, msg ->
        SyncUiState(
            pendingMutations = mutations,
            isSyncing = syncing,
            lastSyncMessage = msg
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SyncUiState()
    )

    fun syncNow() {
        viewModelScope.launch {
            _isSyncing.value = true
            _lastMessage.value = "Syncing with cloud..."
            val result = syncEngine.performSync()
            _isSyncing.value = false
            if (result.isSuccess) {
                _lastMessage.value = "Sync completed successfully. ${result.getOrDefault(0)} items updated."
            } else {
                _lastMessage.value = "Sync failed: ${result.exceptionOrNull()?.message}"
            }
        }
    }
}
