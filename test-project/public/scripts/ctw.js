$(document).ready(function() {
    // Intercept form submission
    $('#searchForm').submit(function(event) {
        event.preventDefault(); // Prevent the form from submitting

        // Show popup overlay
        $('#popupOverlay').css('display', 'block');

        // Send the form data via AJAX
        $.ajax({
            type: 'POST',
            url: '/ctw',
            data: $(this).serialize(), // Serialize form data
            success: function(response, status, xhr) {
                handleFileResponse(response, xhr);
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
                handleFileResponse(xhr.responseText, xhr);
            },
            complete: function() {
                // Hide popup overlay when request is complete
                $('#popupOverlay').css('display', 'none');
            }
        });
    });
});

function handleFileResponse(response, xhr) {
    if (xhr.getResponseHeader('Content-Type').includes('application/pdf')) {
        // Extract the file name from the Content-Disposition header
        var filename = '';
        var disposition = xhr.getResponseHeader('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
            var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            var matches = filenameRegex.exec(disposition);
            if (matches !== null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }

        // Create a temporary URL for the file
        var url = window.URL.createObjectURL(response);

        // Create a link element and trigger download
        var link = document.createElement('a');
        link.href = url;
        link.download = filename || 'CTW.pdf'; // Use extracted filename or default
        document.body.appendChild(link);
        link.click();

        // Clean up resources
        window.URL.revokeObjectURL(url);
        $(link).remove();
    } else {
        // Warn user about potential issues
        alert('Warning: Unexpected response received. Please check your network connection and try again later.');
    }
}
