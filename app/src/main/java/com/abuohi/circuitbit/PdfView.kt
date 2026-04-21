package com.abuohi.circuitbit

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.abuohi.circuitbit.utils.FileDownloadHelper
import com.airbnb.lottie.LottieAnimationView
import com.davemorrissey.labs.subscaleview.SubsamplingScaleImageView
import com.google.android.material.floatingactionbutton.FloatingActionButton

/**
 * Displays a single schematic / PDF file from Firebase Storage.
 *
 * A Download FAB is shown so the user can save the currently viewed file
 * to the device's Downloads folder via [FileDownloadHelper].
 *
 * Expected Intent extras:
 *   - "fileUrl"   : String  – Firebase Storage download URL of the file
 *   - "fileName"  : String  – human-readable file name (e.g. "SM-A525F_schematic.pdf")
 *   - "brand"     : String  – phone brand (used in the info header)
 *   - "solution"  : String  – solution label shown below the brand
 */
class PdfView : AppCompatActivity() {

    private lateinit var imageView: SubsamplingScaleImageView
    private lateinit var lottieView: LottieAnimationView
    private lateinit var progressBar: ProgressBar
    private lateinit var progressText: TextView
    private lateinit var errorText: TextView
    private lateinit var retryButton: Button
    private lateinit var fabDownload: FloatingActionButton
    private lateinit var topHeader: View
    private lateinit var brandShow: TextView
    private lateinit var solutionShow: TextView
    private lateinit var watermark: TextView

    private var fileUrl: String = ""
    private var fileName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pdf_view)

        fileUrl    = intent.getStringExtra("fileUrl")   ?: ""
        fileName   = intent.getStringExtra("fileName")  ?: "circuitbit_file"
        val brand  = intent.getStringExtra("brand")     ?: ""
        val solution = intent.getStringExtra("solution") ?: ""

        bindViews()
        populateHeader(brand, solution)
        setupDownloadButton()
        retryButton.setOnClickListener { loadFile() }

        if (fileUrl.isNotEmpty()) loadFile() else showError("No file URL provided")
    }

    private fun bindViews() {
        imageView    = findViewById(R.id.image_view)
        lottieView   = findViewById(R.id.lottieAnimationView2)
        progressBar  = findViewById(R.id.pdf_progress_bar)
        progressText = findViewById(R.id.pdfloadtext)
        errorText    = findViewById(R.id.error_text_view)
        retryButton  = findViewById(R.id.retry_button)
        fabDownload  = findViewById(R.id.fab_download)
        topHeader    = findViewById(R.id.tophad)
        brandShow    = findViewById(R.id.brandshow)
        solutionShow = findViewById(R.id.solutionshow)
        watermark    = findViewById(R.id.watermark)
    }

    private fun populateHeader(brand: String, solution: String) {
        if (brand.isNotEmpty() || solution.isNotEmpty()) {
            topHeader.visibility   = View.VISIBLE
            brandShow.text         = brand
            solutionShow.text      = solution
        }
    }

    private fun setupDownloadButton() {
        fabDownload.setOnClickListener {
            if (fileUrl.isEmpty()) {
                android.widget.Toast.makeText(this, "No file to download", android.widget.Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            FileDownloadHelper.download(
                context  = this,
                url      = fileUrl,
                fileName = fileName,
                mimeType = FileDownloadHelper.mimeTypeFor(fileName)
            )
        }
    }

    private fun loadFile() {
        showLoading()

        // TODO: Replace with your actual image / PDF loading logic.
        //
        // For a remote image via SubsamplingScaleImageView + Glide:
        //   Glide.with(this)
        //       .asBitmap()
        //       .load(fileUrl)
        //       .into(object : CustomTarget<Bitmap>() {
        //           override fun onResourceReady(resource: Bitmap, t: Transition<in Bitmap>?) {
        //               imageView.setImage(ImageSource.bitmap(resource))
        //               showContent()
        //           }
        //           override fun onLoadCleared(placeholder: Drawable?) {}
        //           override fun onLoadFailed(errorDrawable: Drawable?) { showError("Failed to load image") }
        //       })
        //
        // For a PDF (e.g. via AndroidPdfViewer):
        //   PDFView.fromUrl(fileUrl)
        //       .onProgress { progress, current, total ->
        //           val pct = (current * 100 / total)
        //           progressBar.progress = pct
        //           progressText.text = "$pct%"
        //       }
        //       .onLoad { showContent() }
        //       .onError { showError(it.message ?: "Failed to load PDF") }
        //       .load()
    }

    private fun showLoading() {
        lottieView.visibility  = View.VISIBLE
        progressBar.visibility = View.VISIBLE
        progressText.visibility = View.VISIBLE
        imageView.visibility   = View.GONE
        errorText.visibility   = View.GONE
        retryButton.visibility = View.GONE
        fabDownload.hide()
    }

    private fun showContent() {
        lottieView.visibility   = View.GONE
        progressBar.visibility  = View.GONE
        progressText.visibility = View.GONE
        imageView.visibility    = View.VISIBLE
        errorText.visibility    = View.GONE
        retryButton.visibility  = View.GONE
        fabDownload.show()      // show the Download FAB once content is ready
    }

    private fun showError(message: String) {
        lottieView.visibility   = View.GONE
        progressBar.visibility  = View.GONE
        progressText.visibility = View.GONE
        imageView.visibility    = View.GONE
        errorText.visibility    = View.VISIBLE
        errorText.text          = message
        retryButton.visibility  = View.VISIBLE
        fabDownload.hide()
    }
}
