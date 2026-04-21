package com.abuohi.circuitbit

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.abuohi.circuitbit.utils.FileDownloadHelper

/**
 * Shows the list of solution files (schematics / PDFs) for a selected device model.
 *
 * Each item in the list has a Download button. Tapping it enqueues the file
 * via Android's DownloadManager so it is saved to the device's Downloads folder.
 *
 * Expected Intent extras:
 *   - "brand"  : String – the phone brand (e.g. "SAMSUNG")
 *   - "model"  : String – the device model  (e.g. "SM-A525F")
 */
class ModelActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var brandTitle: TextView
    private lateinit var progressBar: android.widget.ProgressBar
    private lateinit var errorLayout: android.view.View
    private lateinit var errorText: TextView
    private lateinit var retryButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_model)

        val brand = intent.getStringExtra("brand") ?: ""
        val model = intent.getStringExtra("model") ?: ""

        brandTitle = findViewById(R.id.brand_title)
        recyclerView = findViewById(R.id.recycler_view)
        progressBar = findViewById(R.id.progress_bar)
        errorLayout = findViewById(R.id.error_layout)
        errorText = findViewById(R.id.error_text_view)
        retryButton = findViewById(R.id.retry_button)

        brandTitle.text = brand
        recyclerView.layoutManager = LinearLayoutManager(this)

        retryButton.setOnClickListener { loadSolutions(brand, model) }

        loadSolutions(brand, model)
    }

    private fun loadSolutions(brand: String, model: String) {
        showLoading()
        // TODO: Replace with your actual Firebase / API call to fetch solution files.
        // Each SolutionItem should contain at minimum: name, downloadUrl, mimeType.
        //
        // Example (Firebase Realtime Database):
        //
        //   FirebaseDatabase.getInstance().getReference("solutions/$brand/$model")
        //       .addListenerForSingleValueEvent(object : ValueEventListener {
        //           override fun onDataChange(snapshot: DataSnapshot) {
        //               val items = snapshot.children.mapNotNull {
        //                   it.getValue(SolutionItem::class.java)
        //               }
        //               showSolutions(items)
        //           }
        //           override fun onCancelled(error: DatabaseError) { showError(error.message) }
        //       })
    }

    private fun showSolutions(items: List<SolutionItem>) {
        progressBar.visibility = android.view.View.GONE
        errorLayout.visibility = android.view.View.GONE
        recyclerView.visibility = android.view.View.VISIBLE

        recyclerView.adapter = SolutionAdapter(items) { item ->
            // Called when the Download button is tapped for a solution item
            FileDownloadHelper.download(
                context  = this,
                url      = item.downloadUrl,
                fileName = item.fileName,
                mimeType = FileDownloadHelper.mimeTypeFor(item.fileName)
            )
        }
    }

    private fun showLoading() {
        progressBar.visibility = android.view.View.VISIBLE
        recyclerView.visibility = android.view.View.GONE
        errorLayout.visibility = android.view.View.GONE
    }

    private fun showError(message: String) {
        progressBar.visibility = android.view.View.GONE
        recyclerView.visibility = android.view.View.GONE
        errorLayout.visibility = android.view.View.VISIBLE
        errorText.text = message
    }
}

/**
 * Minimal data class representing one solution file entry.
 * Extend with any additional fields your Firebase data contains.
 */
data class SolutionItem(
    val name: String = "",
    val fileName: String = "",
    val downloadUrl: String = "",
    val mimeType: String = "application/octet-stream"
)

/**
 * RecyclerView adapter that binds [SolutionItem] data to [item_model.xml] cards.
 * Each card shows the model name and a Download button.
 */
class SolutionAdapter(
    private val items: List<SolutionItem>,
    private val onDownloadClick: (SolutionItem) -> Unit
) : RecyclerView.Adapter<SolutionAdapter.ViewHolder>() {

    inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvModelName: TextView = view.findViewById(R.id.tv_model_name)
        val tvSolutionCount: TextView = view.findViewById(R.id.tv_solution_count)
        val btnDownload: ImageButton = view.findViewById(R.id.btn_download)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_model, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.tvModelName.text = item.name
        // tv_solution_count shows the file name (the solution/schematic file identifier)
        holder.tvSolutionCount.text = item.fileName
        holder.btnDownload.setOnClickListener { onDownloadClick(item) }
    }

    override fun getItemCount(): Int = items.size
}
