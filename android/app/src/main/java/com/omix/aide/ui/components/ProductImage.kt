package com.omix.aide.ui.components

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

/**
 * Picks a product photo from the gallery and copies it into the app's own
 * storage.
 *
 * The picked image is copied rather than referenced by content:// URI because a
 * content URI is only readable while the grant from the photo picker lasts,
 * and because the app has to keep working with no permission prompts at all.
 * Nothing is uploaded anywhere.
 */
@Composable
fun ProductImagePicker(
    imagePath: String?,
    onImagePicked: (String?) -> Unit
) {
    val context = LocalContext.current
    var error by remember { mutableStateOf<String?>(null) }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        try {
            onImagePicked(copyImageToStorage(context, uri))
            error = null
        } catch (e: Exception) {
            error = "Could not read that image: ${e.message}"
        }
    }

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (imagePath != null) {
                ProductThumbnail(path = imagePath, size = 72)
                Column(Modifier.weight(1f)) {
                    Text("Photo added", style = MaterialTheme.typography.bodyMedium)
                    TextButton(onClick = { onImagePicked(null) }) { Text("Remove") }
                }
            } else {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant,
                            RoundedCornerShape(12.dp)
                        )
                        .border(
                            1.dp,
                            MaterialTheme.colorScheme.outline,
                            RoundedCornerShape(12.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.AddAPhoto,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                OutlinedButton(
                    onClick = {
                        galleryLauncher.launch(
                            PickVisualMediaRequest(
                                ActivityResultContracts.PickVisualMedia.ImageOnly
                            )
                        )
                    },
                    modifier = Modifier.height(48.dp)
                ) {
                    Text("Add photo")
                }
            }
        }

        error?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

/** Renders a stored product photo, downsampled so a large image cannot OOM. */
@Composable
fun ProductThumbnail(
    path: String,
    size: Int = 56,
    modifier: Modifier = Modifier
) {
    // The context has to be read here, outside the producer: produceState's
    // block is not a composable scope.
    val context = LocalContext.current
    val bitmap by produceState<Bitmap?>(initialValue = null, path, size) {
        value = decodeSampled(path, size)
    }

    Box(
        modifier = modifier
            .size(size.dp)
            .background(
                MaterialTheme.colorScheme.surfaceVariant,
                RoundedCornerShape(10.dp)
            ),
        contentAlignment = Alignment.Center
    ) {
        bitmap?.let {
            Image(
                bitmap = it.asImageBitmap(),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}

/**
 * Decodes at roughly the requested size rather than full resolution. A modern
 * phone photo is 4000px wide; decoding one at full size for a 56dp thumbnail
 * costs tens of megabytes for no visible benefit.
 */
private fun decodeSampled(path: String, targetPx: Int): Bitmap? {
    return try {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, bounds)
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= targetPx) sample *= 2
        BitmapFactory.decodeFile(
            path,
            BitmapFactory.Options().apply { inSampleSize = sample }
        )
    } catch (e: Exception) {
        null
    }
}

/**
 * Streams the picked image into internal storage under a generated name.
 *
 * Uses a UUID rather than the original filename: names can contain characters
 * that are illegal in a path, and two products can share a filename.
 */
private fun copyImageToStorage(context: Context, uri: Uri): String {
    val dir = File(context.filesDir, "product-images").apply { mkdirs() }
    val target = File(dir, "${UUID.randomUUID()}.jpg")

    context.contentResolver.openInputStream(uri)?.use { input ->
        FileOutputStream(target).use { output -> input.copyTo(output) }
    } ?: throw IllegalStateException("could not open the selected image")

    return target.absolutePath
}