package com.abuohi.circuitbit.utils

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.widget.Toast

/**
 * Helper class that uses Android's built-in [DownloadManager] to download a file
 * from a URL into the device's public Downloads folder.
 *
 * Usage:
 *   FileDownloadHelper.download(context, url = "https://...", fileName = "schematic.pdf")
 */
object FileDownloadHelper {

    /**
     * Enqueue a download request for the given [url].
     *
     * @param context   Android context (Activity or Application).
     * @param url       Direct download URL of the file (e.g. a Firebase Storage download URL).
     * @param fileName  Desired file name saved to the Downloads folder.
     * @param mimeType  MIME type of the file (default "application/octet-stream").
     */
    fun download(
        context: Context,
        url: String,
        fileName: String,
        mimeType: String = "application/octet-stream"
    ) {
        try {
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(fileName)
                setDescription("Downloading via CircuitBit…")
                setMimeType(mimeType)
                // Make the file visible in the device's Downloads app
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                // Save to the public Downloads directory
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                setAllowedOverMetered(true)
                setAllowedOverRoaming(false)
            }

            val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(request)

            Toast.makeText(context, "Download started: $fileName", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(context, "Download failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Guess a suitable MIME type from a file URL or name.
     */
    fun mimeTypeFor(fileName: String): String = when {
        fileName.endsWith(".pdf", ignoreCase = true)  -> "application/pdf"
        fileName.endsWith(".jpg", ignoreCase = true) ||
        fileName.endsWith(".jpeg", ignoreCase = true) -> "image/jpeg"
        fileName.endsWith(".png", ignoreCase = true)  -> "image/png"
        fileName.endsWith(".zip", ignoreCase = true)  -> "application/zip"
        else -> "application/octet-stream"
    }
}
