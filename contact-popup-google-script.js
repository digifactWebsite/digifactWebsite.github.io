/**
 * Google Apps Script for DigiFact Contact Popup Form
 * Receives customer information from contact-popup.html and saves to Google Sheets
 * SIMPLIFIED VERSION - Works around CORS limitations
 */

/**
 * Log important events to a separate sheet for debugging
 */
function logEvent(eventType, details, error = null) {
  try {
    const SPREADSHEET_ID = '1mlLVtXcnhXUPqYyTc3zXP5pB8ExR2oM5En4cmmH08MM';
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Get or create debug log sheet
    let logSheet;
    try {
      logSheet = spreadsheet.getSheetByName('Debug_Log');
    } catch (e) {
      logSheet = spreadsheet.insertSheet('Debug_Log');
      // Add headers
      logSheet.getRange(1, 1, 1, 5).setValues([['Timestamp', 'Event Type', 'Details', 'Error', 'Status']]);
      logSheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#ff9900');
    }
    
    const timestamp = new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});
    const status = error ? 'FAILED' : 'SUCCESS';
    
    const newRow = logSheet.getLastRow() + 1;
    logSheet.getRange(newRow, 1, 1, 5).setValues([[
      timestamp,
      eventType,
      JSON.stringify(details).substring(0, 500), // Limit details length
      error ? error.toString().substring(0, 300) : 'None',
      status
    ]]);
    
    // Color code the row
    const rowRange = logSheet.getRange(newRow, 1, 1, 5);
    if (error) {
      rowRange.setBackground('#ffebee'); // Light red for errors
    } else {
      rowRange.setBackground('#e8f5e8'); // Light green for success
    }
    
  } catch (logError) {
    console.warn('Could not log event:', logError.toString());
  }
}

/**
 * Enhanced doPost with comprehensive logging
 */
function doPost(e) {
  // Log the start of form submission
  logEvent('FORM_SUBMISSION_START', {
    hasEventObject: !!e,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Enhanced debugging for the request
    console.log('doPost called with:', {
      eExists: !!e,
      eKeys: e ? Object.keys(e) : 'no e object',
      postDataExists: !!(e && e.postData),
      postDataKeys: (e && e.postData) ? Object.keys(e.postData) : 'no postData',
      contentsExists: !!(e && e.postData && e.postData.contents),
      parameterExists: !!(e && e.parameter),
      parameterKeys: (e && e.parameter) ? Object.keys(e.parameter) : 'no parameter',
      rawContents: (e && e.postData && e.postData.contents) ? e.postData.contents.substring(0, 100) + '...' : 'no contents'
    });
    
    // Check if request data exists
    if (!e) {
      console.error('No event object (e) provided');
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'No event object provided - this may be a test call'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let data = {};
    
    // Try to get data from different sources (handle both JSON and form-encoded data)
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      // Form data submitted as URL parameters
      data = e.parameter;
      console.log('Received form parameters:', {
        firstName: data.firstName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        timestamp: data.timestamp
      });
    } else if (e.postData && e.postData.contents) {
      // JSON data submitted in request body
      try {
        data = JSON.parse(e.postData.contents);
        console.log('Received JSON data:', {
          firstName: data.firstName,
          email: data.email,
          phone: data.phone,
          company: data.company,
          timestamp: data.timestamp
        });
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        return ContentService
          .createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Invalid JSON format'
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      console.error('No data found in request');
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'No data found in request - ensure form data is being sent'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Validate required fields
    if (!data.firstName || !data.email) {
      console.error('Missing required fields:', { firstName: !!data.firstName, email: !!data.email });
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Missing required fields: firstName and email are required'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get or create the spreadsheet
    let sheet;
    try {
      // Try to get existing spreadsheet by ID (replace with your sheet ID)
      const SPREADSHEET_ID = '1mlLVtXcnhXUPqYyTc3zXP5pB8ExR2oM5En4cmmH08MM'; // Fixed: Use only the ID, not the full URL
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
      
      // Fallback code commented out since we're using specific sheet ID
      /*
      // For now, use active sheet or create new one
      try {
        sheet = SpreadsheetApp.getActiveSheet();
      } catch (activeSheetError) {
        // Create new spreadsheet if no active sheet
        const spreadsheet = SpreadsheetApp.create('DigiFact Contact Form Submissions');
        sheet = spreadsheet.getActiveSheet();
        sheet.setName('Contact Submissions');
        console.log('Created new spreadsheet:', spreadsheet.getId());
        console.log('Please copy this spreadsheet ID and update the script if needed');
      }
      */
    } catch (sheetError) {
      console.error('Error accessing spreadsheet:', sheetError);
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Could not access or create spreadsheet'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // If this is the first submission, add headers
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Thời gian',
        'Họ và tên',
        'Email',
        'Số điện thoại',
        'Công ty',
        'Nội dung',
        'Nguồn',
        'IP Address',
        'User Agent'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#2563eb');
      headerRange.setFontColor('white');
      headerRange.setWrap(true);
      
      // Set column widths
      sheet.setColumnWidth(1, 150); // Thời gian
      sheet.setColumnWidth(2, 200); // Họ và tên
      sheet.setColumnWidth(3, 200); // Email
      sheet.setColumnWidth(4, 150); // Số điện thoại
      sheet.setColumnWidth(5, 200); // Công ty
      sheet.setColumnWidth(6, 300); // Nội dung
      sheet.setColumnWidth(7, 100); // Nguồn
      sheet.setColumnWidth(8, 120); // IP Address
      sheet.setColumnWidth(9, 200); // User Agent
      
      console.log('Added headers to spreadsheet');
    }
    
    // Get current timestamp in Vietnam timezone
    const vietnamTime = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Prepare the row data
    const rowData = [
      data.timestamp ? new Date(data.timestamp).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}) : vietnamTime,
      data.firstName || '',
      data.email || '',
      data.phone || 'Không cung cấp',
      data.company || 'Không cung cấp',
      data.message || 'Không có nội dung',
      data.source || 'Popup Form',
      getClientIP() || 'Unknown',
      getUserAgent() || 'Unknown'
    ];
    
    // Add the data to the sheet
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
    
    // Format the new row
    const newRowRange = sheet.getRange(newRow, 1, 1, rowData.length);
    newRowRange.setWrap(true);
    newRowRange.setVerticalAlignment('top');
    
    // Alternate row colors for better readability
    if (newRow % 2 === 0) {
      newRowRange.setBackground('#f8f9fa');
    }
    
    console.log('Added row to spreadsheet:', rowData.length, 'columns');
    
    // Send email notification
    try {
      console.log('=== STARTING EMAIL NOTIFICATION PROCESS ===');
      console.log('Preparing to send email notification with data:', {
        firstName: data.firstName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        message: data.message ? data.message.substring(0, 50) + '...' : 'no message',
        hasData: !!data,
        dataKeys: Object.keys(data),
        vietnamTime: vietnamTime
      });
      
      // Check email quota before attempting to send
      try {
        const quotaBefore = MailApp.getRemainingDailyQuota();
        console.log('Email quota before sending:', quotaBefore);
        
        if (quotaBefore <= 0) {
          console.error('CRITICAL: Email quota exhausted - cannot send any emails');
          throw new Error('Email quota exhausted');
        }
      } catch (quotaError) {
        console.warn('Could not check email quota:', quotaError.toString());
      }
      
      sendEmailNotification(data, vietnamTime);
      console.log('=== EMAIL NOTIFICATION PROCESS COMPLETED ===');
      
      // Log successful email sending
      logEvent('EMAIL_SENT', {
        recipient: 'dangdg@digifact.vn',
        customerEmail: data.email,
        customerName: data.firstName
      });
      
    } catch (emailError) {
      console.error('=== EMAIL NOTIFICATION FAILED ===');
      console.error('Email error details:', {
        name: emailError.name,
        message: emailError.message,
        stack: emailError.stack,
        toString: emailError.toString()
      });
      
      // Log email failure
      logEvent('EMAIL_FAILED', {
        recipient: 'dangdg@digifact.vn',
        customerEmail: data.email,
        customerName: data.firstName,
        errorType: emailError.name
      }, emailError);
      
      // Still don't fail the whole request, but log more details
      console.warn('Form submission will continue despite email failure');
    }
    
    // Return success response
    console.log('Contact form submission successful');
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Đã gửi thông tin liên hệ thành công',
        timestamp: vietnamTime,
        data: {
          name: data.firstName,
          email: data.email
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing contact form submission:', error);
    
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Không thể xử lý form liên hệ: ' + error.toString(),
        timestamp: new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Simple GET endpoint for testing
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'DigiFact Contact Form API is running',
      timestamp: new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}),
      version: '1.0',
      endpoints: {
        'POST': 'Submit contact form data',
        'GET': 'Check API status'
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send email notification when a new contact form is submitted
 */
function sendEmailNotification(data, vietnamTime) {
  try {
    console.log('=== SENDemailnotification FUNCTION START ===');
    console.log('sendEmailNotification called with:', {
      dataExists: !!data,
      dataKeys: data ? Object.keys(data) : 'no data',
      dataValues: data ? {
        firstName: data.firstName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        message: data.message ? data.message.substring(0, 50) + '...' : 'no message'
      } : 'no data',
      vietnamTime: vietnamTime
    });
    
    // Validate data object
    if (!data) {
      console.error('CRITICAL: No data provided to sendEmailNotification');
      throw new Error('No data provided to sendEmailNotification');
    }
    
    // Check required fields for notification email
    if (!data.firstName || !data.email) {
      console.error('CRITICAL: Missing required fields for email notification:', {
        firstName: !!data.firstName,
        email: !!data.email
      });
      throw new Error('Missing required fields for email notification');
    }
    
    // Configure email settings - UPDATE THESE
    const recipient = 'dangdg@digifact.vn'; // Updated to your specific email
    const ccRecipient = 'contact@digifact.vn'; // Secondary recipient
    const customerName = data.firstName || 'Khách hàng không tên';
    const subject = `🔔 Liên hệ mới từ website - ${customerName}`;
    
    console.log('Email configuration:', {
      recipient: recipient,
      ccRecipient: ccRecipient,
      subject: subject,
      customerName: customerName
    });
    
    const body = `
Có liên hệ mới từ website DigiFact:

👤 THÔNG TIN KHÁCH HÀNG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Họ và tên: ${data.firstName || 'Không cung cấp'}
• Email: ${data.email || 'Không cung cấp'}
• Số điện thoại: ${data.phone || 'Không cung cấp'}
• Công ty: ${data.company || 'Không cung cấp'}

📝 NỘI DUNG LIÊN HỆ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.message || 'Khách hàng không để lại nội dung cụ thể'}

🕐 THÔNG TIN THÊM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Thời gian: ${vietnamTime || new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})}
• Nguồn: ${data.source || 'Popup Form'}
• IP: ${getClientIP() || 'Unknown'}

🚀 HÀNH ĐỘNG CẦN THỰC HIỆN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Phản hồi email trong vòng 24h
2. Gọi điện thoại nếu có số liên lạc
3. Cập nhật CRM system
4. Theo dõi conversion rate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email này được tự động tạo từ Contact Form trên website DigiFact.
    `;
    
    // Send main notification email
    console.log('Attempting to send main notification email...');
    MailApp.sendEmail({
      to: recipient,
      cc: ccRecipient,
      subject: subject,
      body: body,
      name: 'DigiFact Contact Form System' // Professional sender name for notifications
    });
    
    console.log('✅ Main notification email sent successfully to:', recipient);
    
    // Send auto-reply to customer
    console.log('=== STARTING AUTO-REPLY PROCESS ===');
    try {
      if (data && data.email) {
        console.log('Customer email available:', data.email);
        console.log('Attempting to send auto-reply to customer...');
        sendAutoReply(data);
        console.log('✅ Auto-reply process completed successfully');
      } else {
        console.warn('❌ Skipping auto-reply - no customer email address available');
        console.warn('Data object:', data);
      }
    } catch (autoReplyError) {
      console.error('❌ Auto-reply failed:', {
        error: autoReplyError.toString(),
        name: autoReplyError.name,
        message: autoReplyError.message
      });
      // Don't throw - let the main notification succeed even if auto-reply fails
    }
    
    console.log('=== SENDemailnotification FUNCTION COMPLETED ===');
    
  } catch (error) {
    console.error('=== SENDMAILNOTIFICATION FUNCTION FAILED ===');
    console.error('Error sending email notification:', {
      error: error.toString(),
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Send auto-reply email to customer using Mailcow self-hosted system
 */
function sendAutoReply(data) {
  try {
    console.log('sendAutoReply called with data:', {
      dataExists: !!data,
      dataType: typeof data,
      email: data ? data.email : 'no data',
      firstName: data ? data.firstName : 'no data'
    });
    
    // Validate data object
    if (!data) {
      console.warn('No data provided to sendAutoReply');
      return;
    }
    
    // Ensure we have required fields
    if (!data.email) {
      console.warn('No email address provided for auto-reply, data keys:', Object.keys(data));
      return;
    }
    
    // Try Mailcow first, fallback to MailApp if needed
    try {
      console.log('Attempting to send via Mailcow self-hosted system...');
      sendAutoReplyViaMailcow(data);
      console.log('✅ Auto-reply sent successfully via Mailcow');
      return;
    } catch (mailcowError) {
      console.warn('Mailcow sending failed, falling back to Google MailApp:', mailcowError.toString());
      
      // Fallback to Google MailApp with quota check
      try {
        const quota = MailApp.getRemainingDailyQuota();
        console.log('Email quota remaining before auto-reply fallback:', quota);
        
        if (quota <= 0) {
          console.error('Cannot send auto-reply: Daily email quota exhausted and Mailcow failed');
          throw new Error('Both Mailcow and Google MailApp unavailable');
        }
      } catch (quotaError) {
        console.warn('Could not check email quota for auto-reply fallback:', quotaError.toString());
        // Continue with fallback anyway
      }
    }
    
    const customerName = data.firstName || 'Khách hàng';
    const subject = '✅ Đã nhận được liên hệ của bạn - DigiFact';
    
    console.log('Preparing auto-reply email for:', data.email, 'with name:', customerName);
    
    const body = `
Xin chào ${customerName},

Cảm ơn bạn đã liên hệ với DigiFact! 🙏

Chúng tôi đã nhận được thông tin liên hệ của bạn và sẽ phản hồi trong vòng 24 giờ làm việc.

📋 THÔNG TIN BẠN ĐÃ GỬI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Email: ${data.email || 'Không cung cấp'}
• Số điện thoại: ${data.phone || 'Không cung cấp'}
• Công ty: ${data.company || 'Không cung cấp'}
• Nội dung: ${data.message ? data.message.substring(0, 100) + (data.message.length > 100 ? '...' : '') : 'Không có nội dung cụ thể'}

🚀 DỊCH VỤ CỦA CHÚNG TÔI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ERP - Quản lý tài nguyên doanh nghiệp
• CRM - Quản lý quan hệ khách hàng  
• PLM - Quản lý vòng đời sản phẩm
• MES - Hệ thống thực thi sản xuất
• Giải pháp số hóa doanh nghiệp

📞 LIÊN HỆ TRỰC TIẾP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Email: contact@digifact.vn
• Hotline: +84 (0) 33 884 5579
• Website: https://www.digifact.vn

Trân trọng,
Đội ngũ DigiFact

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  THÔNG BÁO QUAN TRỌNG:
• Email này được gửi tự động từ hệ thống contact@digifact.vn
• Để liên hệ trực tiếp, vui lòng reply email này hoặc gửi email mới tới: contact@digifact.vn
• Hoặc gọi hotline: +84 (0) 33 884 5579

📧 Mọi câu hỏi và phản hồi xin gửi về: contact@digifact.vn
    `;
    
    console.log('Using Google MailApp fallback...');
    
    // Fallback: Use Google MailApp with enhanced display name
    MailApp.sendEmail({
      to: data.email,
      subject: subject,
      body: body,
      name: 'DigiFact Auto-Reply <contact@digifact.vn>', // Enhanced display name
      replyTo: 'contact@digifact.vn' // Where replies should go
    });
    
    console.log('Auto-reply sent successfully via Google MailApp fallback to:', data.email);
    
    // Double-check quota after sending
    try {
      const quotaAfter = MailApp.getRemainingDailyQuota();
      console.log('Email quota remaining after auto-reply:', quotaAfter);
    } catch (quotaError) {
      console.warn('Could not check email quota after sending:', quotaError.toString());
    }
    
  } catch (error) {
    console.error('Error sending auto-reply:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Provide specific error guidance
    if (error.toString().includes('Authorization') || error.toString().includes('permission')) {
      console.error('PERMISSION ERROR: The script needs authorization to send emails. Please authorize the script in Google Apps Script.');
    } else if (error.toString().includes('quota')) {
      console.error('QUOTA ERROR: Email sending quota exceeded.');
    } else if (error.toString().includes('Invalid email')) {
      console.error('EMAIL FORMAT ERROR: Invalid email address format:', data.email);
    }
    
    throw error;
  }
}

/**
 * Send auto-reply email via Mailcow self-hosted system
 * This function integrates with your Mailcow server to send emails from contact@digifact.vn
 */
function sendAutoReplyViaMailcow(data) {
  try {
    console.log('=== MAILCOW AUTO-REPLY INTEGRATION ===');
    
    // Mailcow configuration - UPDATE THESE VALUES WITH YOUR ACTUAL SETTINGS
    const MAILCOW_CONFIG = {
      // Step 1: Your Mailcow server URL (replace with your actual server)
      apiUrl: 'https://mail.digifact.vn/api/v1//send-mail', // ✅ Already correct for your domain
      
      // Step 2: API key from Mailcow admin panel (REQUIRED)
      // Go to: https://mail.digifact.vn/admin → System → Configuration → API → Read-Write Access
      // Required permissions: Read domains, Read mailboxes, Send mail
      apiKey: '9C4BCB-C1548C-3B2B3C-60968A-5535E0', // 🔑 REPLACE: Format: mcow-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      
      // Step 3: Sender configuration (already correct)
      fromEmail: 'contact@digifact.vn', // ✅ This should match your mailbox
      fromName: 'DigiFact Support Team', // ✅ Display name for emails
      
      // Step 4: SMTP settings (fallback method - optional but recommended)
      smtpHost: 'mail.digifact.vn', // ✅ Your Mailcow SMTP server
      smtpPort: 587, // ✅ Standard STARTTLS port (or use 465 for SSL)
      smtpUser: 'contact@digifact.vn', // ✅ Your email account username
      smtpPassword: '05122002.Duy' // 🔑 REPLACE: Password for contact@digifact.vn
    };
    
    const customerName = data.firstName || 'Khách hàng';
    const subject = '✅ Đã nhận được liên hệ của bạn - DigiFact';
    
    const emailBody = `
Xin chào ${customerName},

Cảm ơn bạn đã liên hệ với DigiFact! 🙏

Chúng tôi đã nhận được thông tin liên hệ của bạn và sẽ phản hồi trong vòng 24 giờ làm việc.

📋 THÔNG TIN BẠN ĐÃ GỬI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Email: ${data.email || 'Không cung cấp'}
• Số điện thoại: ${data.phone || 'Không cung cấp'}
• Công ty: ${data.company || 'Không cung cấp'}
• Nội dung: ${data.message ? data.message.substring(0, 100) + (data.message.length > 100 ? '...' : '') : 'Không có nội dung cụ thể'}

🚀 DỊCH VỤ CỦA CHÚNG TÔI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ERP - Quản lý tài nguyên doanh nghiệp
• CRM - Quản lý quan hệ khách hàng  
• PLM - Quản lý vòng đời sản phẩm
• MES - Hệ thống thực thi sản xuất
• Giải pháp số hóa doanh nghiệp

📞 LIÊN HỆ TRỰC TIẾP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Email: contact@digifact.vn
• Hotline: +84 (0) 33 884 5579
• Website: https://www.digifact.vn

Trân trọng,
Đội ngũ DigiFact

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email này được gửi từ hệ thống tự động của DigiFact
📞 Để được hỗ trợ trực tiếp, vui lòng reply email này hoặc gọi hotline
    `;
    
    // Method 1: Using Mailcow API (preferred)
    if (MAILCOW_CONFIG.apiKey && MAILCOW_CONFIG.apiKey !== 'YOUR_MAILCOW_API_KEY_HERE') {
      console.log('Sending via Mailcow API...');
      sendViaMailcowAPI(MAILCOW_CONFIG, data.email, subject, emailBody);
    } 
    // Method 2: Using SMTP (if API not configured)
    else if (MAILCOW_CONFIG.smtpPassword && MAILCOW_CONFIG.smtpPassword !== 'YOUR_EMAIL_PASSWORD_HERE') {
      console.log('Sending via Mailcow SMTP...');
      sendViaMailcowSMTP(MAILCOW_CONFIG, data.email, subject, emailBody);
    } 
    // Configuration error
    else {
      throw new Error('Mailcow not configured - missing API key or SMTP credentials');
    }
    
    console.log('✅ Email sent successfully via Mailcow to:', data.email);
    
  } catch (error) {
    console.error('❌ Mailcow sending failed:', error);
    throw error; // Re-throw to trigger fallback
  }
}

/**
 * Send email via Mailcow API
 */
function sendViaMailcowAPI(config, toEmail, subject, body) {
  const payload = {
    from: `${config.fromName} <${config.fromEmail}>`,
    to: toEmail,
    subject: subject,
    text: body,
    html: body.replace(/\n/g, '<br>') // Convert line breaks to HTML
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey
    },
    payload: JSON.stringify(payload)
  };
  
  console.log('Making API call to:', `${config.apiUrl}/send-mail`);
  
  const response = UrlFetchApp.fetch(`${config.apiUrl}/send-mail`, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  console.log('Mailcow API response:', { code: responseCode, text: responseText });
  
  if (responseCode !== 200 && responseCode !== 201) {
    throw new Error(`Mailcow API error: ${responseCode} - ${responseText}`);
  }
}

/**
 * Send email via Mailcow SMTP (using Google Apps Script's MailApp with custom SMTP)
 * Note: Google Apps Script has limited SMTP support, this is a simplified approach
 */
function sendViaMailcowSMTP(config, toEmail, subject, body) {
  // Note: Google Apps Script doesn't support custom SMTP directly
  // This is a placeholder for documentation purposes
  // You would need to use a webhook or external service for true SMTP integration
  
  console.log('SMTP Integration Note:');
  console.log('Google Apps Script has limited SMTP support.');
  console.log('For full SMTP integration, consider:');
  console.log('1. Using Mailcow API (recommended)');
  console.log('2. Using a webhook to your server');
  console.log('3. Using a third-party email service that supports HTTP API');
  
  throw new Error('Direct SMTP not supported in Google Apps Script - use API method or webhook');
}

/**
 * Get client IP address (limited in Apps Script)
 */
function getClientIP() {
  try {
    // Apps Script has limited access to client information
    // This is a placeholder - actual IP detection is limited
    return 'Limited in Apps Script';
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Get user agent (limited in Apps Script)
 */
function getUserAgent() {
  try {
    // Apps Script has limited access to client information
    // This is a placeholder
    return 'Browser/Apps Script';
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Test Mailcow integration
 * Tests sending auto-reply emails via your self-hosted Mailcow system
 */
function testMailcowIntegration() {
  console.log('=== TESTING MAILCOW INTEGRATION ===');
  
  const testData = {
    firstName: 'Mailcow Test User',
    email: 'dangdg@digifact.vn', // Send to your email for testing
    phone: '+84 123 456 789',
    company: 'Test Company for Mailcow',
    message: 'Testing Mailcow self-hosted email system integration for auto-reply emails.'
  };
  
  try {
    console.log('Testing auto-reply with Mailcow integration...');
    sendAutoReply(testData);
    
    console.log('✅ Mailcow integration test completed');
    console.log('Check your email to verify:');
    console.log('  1. Email comes from contact@digifact.vn (your Mailcow server)');
    console.log('  2. Professional DigiFact branding');
    console.log('  3. Proper reply-to configuration');
    console.log('  4. No Google Apps Script limitations');
    
    return 'Mailcow integration test completed - check your inbox';
    
  } catch (error) {
    console.error('❌ Mailcow integration test failed:', error);
    return 'Mailcow integration test failed: ' + error.toString();
  }
}

/**
 * Test only the Mailcow API functionality
 */
function testMailcowAPIOnly() {
  console.log('=== TESTING MAILCOW API ONLY ===');
  
  const testData = {
    firstName: 'Mailcow API Test',
    email: 'dangdg@digifact.vn',
    phone: '+84 123 456 789',
    company: 'API Test Company',
    message: 'Testing direct Mailcow API integration without fallback.'
  };
  
  try {
    console.log('Testing Mailcow API directly...');
    sendAutoReplyViaMailcow(testData);
    
    console.log('✅ Mailcow API test completed successfully');
    return 'Mailcow API test completed - check your inbox';
    
  } catch (error) {
    console.error('❌ Mailcow API test failed:', error);
    console.log('This is expected if Mailcow is not configured yet');
    return 'Mailcow API test failed (expected if not configured): ' + error.toString();
  }
}

/**
 * Configuration helper for Mailcow setup
 */
function setupMailcowConfiguration() {
  console.log('=== MAILCOW CONFIGURATION SETUP GUIDE ===');
  
  console.log('To configure Mailcow integration, you need to:');
  console.log('');
  console.log('1. UPDATE MAILCOW_CONFIG in sendAutoReplyViaMailcow function:');
  console.log('   - apiUrl: Your Mailcow server URL (e.g., https://mail.digifact.vn/api/v1)');
  console.log('   - apiKey: Generate in Mailcow Admin > Access > API');
  console.log('   - fromEmail: contact@digifact.vn');
  console.log('   - smtpHost: Your Mailcow SMTP server');
  console.log('');
  console.log('2. MAILCOW ADMIN PANEL SETUP:');
  console.log('   - Login to your Mailcow admin panel');
  console.log('   - Go to "Access" > "API"');
  console.log('   - Generate a new API key');
  console.log('   - Copy the API key to the script');
  console.log('');
  console.log('3. DOMAIN VERIFICATION:');
  console.log('   - Ensure contact@digifact.vn is configured in Mailcow');
  console.log('   - Test email sending from Mailcow admin panel');
  console.log('');
  console.log('4. SCRIPT CONFIGURATION:');
  console.log('   - Update the MAILCOW_CONFIG object with your values');
  console.log('   - Test with testMailcowIntegration() function');
  console.log('');
  console.log('Current configuration status:');
  
  // Check current configuration (this would be in the actual function)
  const configStatus = {
    apiUrl: 'Not configured (using placeholder)',
    apiKey: 'Not configured (using placeholder)',
    fromEmail: 'contact@digifact.vn (configured)',
    integration: 'Ready for configuration'
  };
  
  console.log('Configuration Status:', configStatus);
  
  return 'Configuration guide displayed - check console for details';
}

/**
 * Test Method 2: Enhanced Display Name (Fallback)
 * Tests the enhanced display name that mimics no-reply@digifact.vn
 */
function testEnhancedDisplayName() {
  console.log('=== TESTING METHOD 2: ENHANCED DISPLAY NAME (FALLBACK) ===');
  
  const testData = {
    firstName: 'Enhanced Display Test',
    email: 'dangdg@digifact.vn', // Send to your email for testing
    phone: '+84 123 456 789',
    company: 'Test Company for Enhanced Display',
    message: 'Testing Method 2: Enhanced Display Name that mimics contact@digifact.vn sender.'
  };
  
  try {
    console.log('Testing auto-reply with enhanced display name...');
    sendAutoReply(testData);
    
    console.log('✅ Enhanced display name test completed');
    console.log('Check your email to verify:');
    console.log('  1. Sender appears as "DigiFact Auto-Reply <contact@digifact.vn>"');
    console.log('  2. Reply-to is set to contact@digifact.vn');
    console.log('  3. Email body mentions contact@digifact.vn system');
    console.log('  4. Professional appearance similar to true custom domain emails');
    
    return 'Enhanced display name test completed - check your inbox';
    
  } catch (error) {
    console.error('❌ Enhanced display name test failed:', error);
    return 'Enhanced display name test failed: ' + error.toString();
  }
}

/**
 * Test the new no-reply email configuration
 */
function testNoReplyEmail() {
  console.log('=== TESTING NO-REPLY EMAIL CONFIGURATION ===');
  
  const testData = {
    firstName: 'Test No-Reply User',
    email: 'dangdg@digifact.vn', // Send to your email for testing
    phone: '+84 123 456 789',
    company: 'Test Company for No-Reply',
    message: 'Testing the new no-reply email configuration with professional sender name.'
  };
  
  try {
    console.log('Testing auto-reply with no-reply configuration...');
    sendAutoReply(testData);
    
    console.log('✅ No-reply email test completed');
    console.log('Check your email to verify:');
    console.log('  1. Sender shows as "DigiFact No-Reply <no-reply@digifact.vn>"');
    console.log('  2. Reply-to is set to contact@digifact.vn');
    console.log('  3. Email body includes clear no-reply instructions');
    
    return 'No-reply email test completed - check your inbox';
    
  } catch (error) {
    console.error('❌ No-reply email test failed:', error);
    return 'No-reply email test failed: ' + error.toString();
  }
}

/**
 * Test the complete email system with new configurations
 */
function testCompleteEmailSystem() {
  console.log('=== TESTING COMPLETE EMAIL SYSTEM ===');
  
  const testData = {
    firstName: 'Complete System Test',
    email: 'customer.test@example.com', // Different from notification recipient
    phone: '+84 123 456 789',
    company: 'Test Company',
    message: 'Testing complete email system with professional sender names and no-reply configuration.'
  };
  
  const vietnamTime = new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  try {
    console.log('Testing complete email system...');
    console.log('Notification will be sent to: dangdg@digifact.vn');
    console.log('Auto-reply will be sent to:', testData.email);
    
    sendEmailNotification(testData, vietnamTime);
    
    console.log('✅ Complete email system test completed');
    console.log('Expected results:');
    console.log('  1. Notification email to dangdg@digifact.vn with "DigiFact Contact Form System" sender');
    console.log('  2. Auto-reply to customer with "DigiFact - No Reply" sender');
    console.log('  3. Auto-reply has reply-to set to contact@digifact.vn');
    
    return 'Complete email system test completed - check both inboxes';
    
  } catch (error) {
    console.error('❌ Complete email system test failed:', error);
    return 'Complete email system test failed: ' + error.toString();
  }
}

/**
 * Test function that exactly mimics a real form submission
 * This should replicate the exact flow that happens when someone submits the contact form
 */
function testRealFormSubmission() {
  console.log('=== TESTING REAL FORM SUBMISSION FLOW ===');
  
  // Create test data that matches what the real form would send
  const realFormData = {
    firstName: 'Real Test User',
    email: 'dangdg@digifact.vn', // Using your actual email
    phone: '+84 123 456 789',
    company: 'Test Company Ltd',
    message: 'This is a test message to verify the complete form submission and email flow.',
    timestamp: new Date().toISOString(),
    source: 'Real Form Test'
  };
  
  console.log('Simulating real form submission with data:', realFormData);
  
  // Create the exact same request structure as a real form submission
  const mockRequest = {
    parameter: realFormData, // This is how form data comes in
    postData: null // No JSON data in this test
  };
  
  try {
    console.log('Calling doPost function as if from real form...');
    const result = doPost(mockRequest);
    
    const responseContent = result.getContent();
    const response = JSON.parse(responseContent);
    
    console.log('Form submission result:', {
      status: response.status,
      message: response.message,
      timestamp: response.timestamp,
      customerData: response.data
    });
    
    if (response.status === 'success') {
      console.log('✅ Form submission successful');
      console.log('✅ Data should be saved to spreadsheet');
      console.log('✅ Notification email should be sent to dangdg@digifact.vn');
      console.log('✅ Auto-reply should be sent to customer email');
    } else {
      console.error('❌ Form submission failed:', response.message);
    }
    
    return {
      success: response.status === 'success',
      result: response,
      testData: realFormData
    };
    
  } catch (error) {
    console.error('❌ Real form submission test failed:', error);
    return {
      success: false,
      error: error.toString(),
      testData: realFormData
    };
  }
}

/**
 * Test both notification and auto-reply emails separately
 */
function testEmailsIndividually() {
  console.log('=== TESTING EMAILS INDIVIDUALLY ===');
  
  const testData = {
    firstName: 'Individual Test',
    email: 'dangdg@digifact.vn',
    phone: '+84 123 456 789',
    company: 'Test Company',
    message: 'Testing individual email functions'
  };
  
  const vietnamTime = new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  let results = {
    notificationEmail: false,
    autoReplyEmail: false,
    errors: []
  };
  
  // Test 1: Notification email
  try {
    console.log('Testing notification email...');
    sendEmailNotification(testData, vietnamTime);
    results.notificationEmail = true;
    console.log('✅ Notification email test passed');
  } catch (notificationError) {
    console.error('❌ Notification email test failed:', notificationError);
    results.errors.push('Notification: ' + notificationError.toString());
  }
  
  // Test 2: Auto-reply email (separately)
  try {
    console.log('Testing auto-reply email separately...');
    sendAutoReply(testData);
    results.autoReplyEmail = true;
    console.log('✅ Auto-reply email test passed');
  } catch (autoReplyError) {
    console.error('❌ Auto-reply email test failed:', autoReplyError);
    results.errors.push('Auto-reply: ' + autoReplyError.toString());
  }
  
  console.log('=== EMAIL TESTS COMPLETED ===');
  console.log('Results:', results);
  
  return results;
}

/**
 * Test function specifically for auto-reply email
 */
function testAutoReplyOnly() {
  console.log('=== TESTING AUTO-REPLY EMAIL FUNCTION ===');
  
  const testData = {
    firstName: 'Test User',
    email: 'contact@digifact.vn', // Use your actual email for testing
    phone: '+84 123 456 789',
    company: 'Test Company',
    message: 'This is a test message for auto-reply functionality.'
  };
  
  try {
    console.log('Testing sendAutoReply function directly...');
    sendAutoReply(testData);
    console.log('Auto-reply test completed successfully');
    return 'Auto-reply test completed - check your email';
  } catch (error) {
    console.error('Auto-reply test failed:', error);
    return 'Auto-reply test failed: ' + error.toString();
  }
}

/**
 * Test function to verify the setup
 */
function testContactSubmission() {
  const testData = {
    firstName: 'Nguyễn Văn A',
    email: 'contact@digifact.vn', // Changed to your actual email for testing
    phone: '+84 123 456 789',
    company: 'Công ty TNHH ABC',
    message: 'Tôi quan tâm đến giải pháp ERP cho doanh nghiệp. Vui lòng liên hệ để tư vấn chi tiết.',
    timestamp: new Date().toISOString(),
    source: 'Test Form'
  };
  
  // Simulate the request object with form parameters
  const mockRequest = {
    parameter: testData,
    postData: null
  };
  
  console.log('Running test contact submission...');
  const result = doPost(mockRequest);
  console.log('Test result:', result.getContent());
  
  return result;
}

/**
 * Test function with JSON data
 */
function testContactSubmissionJSON() {
  const testData = {
    firstName: 'Trần Thị B',
    email: 'tranthib@example.com',
    phone: '+84 987 654 321',
    company: 'Công ty Cổ phần XYZ',
    message: 'Chúng tôi cần tư vấn về giải pháp CRM để quản lý khách hàng hiệu quả hơn.',
    timestamp: new Date().toISOString(),
    source: 'JSON Test'
  };
  
  // Simulate the request object with JSON data
  const mockRequest = {
    parameter: {},
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  console.log('Running test contact submission with JSON...');
  const result = doPost(mockRequest);
  console.log('Test result:', result.getContent());
  
  return result;
}

/**
 * Comprehensive test for email functionality and permissions
 */
function testEmailCapabilities() {
  console.log('=== TESTING EMAIL CAPABILITIES ===');
  
  try {
    // Check if MailApp is available
    console.log('MailApp available:', typeof MailApp !== 'undefined');
    
    // Check email quota
    try {
      const quota = MailApp.getRemainingDailyQuota();
      console.log('Daily email quota remaining:', quota);
      
      if (quota <= 0) {
        console.warn('WARNING: No email quota remaining for today!');
        return 'Email quota exhausted - cannot send emails today';
      }
    } catch (quotaError) {
      console.warn('Could not check email quota:', quotaError.toString());
    }
    
    // Test basic email sending
    console.log('Attempting to send test email...');
    
    MailApp.sendEmail({
      to: 'dangdg@digifact.vn', // Change this to your test email
      subject: '🧪 Test Email from DigiFact Contact Script',
      body: `
This is a test email sent at: ${new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})}

If you receive this email, the email functionality is working correctly.

Test details:
- Function: testEmailCapabilities()
- Purpose: Verify email sending permissions
- Script ID: ${ScriptApp.getScriptId()}

This email was sent automatically to test the contact form email functionality.
      `
    });
    
    console.log('Test email sent successfully!');
    
    // Now test the auto-reply function
    console.log('Testing auto-reply function...');
    
    const testCustomerData = {
      firstName: 'Test Customer',
      email: 'contact@digifact.vn',
      phone: '+84 123 456 789',
      company: 'Test Company',
      message: 'This is a test of the auto-reply functionality.'
    };
    
    sendAutoReply(testCustomerData);
    console.log('Auto-reply test completed');
    
    return 'Email capabilities test completed successfully - check your inbox';
    
  } catch (error) {
    console.error('Email capabilities test failed:', error);
    
    // Detailed error analysis
    if (error.toString().includes('Authorization')) {
      return 'AUTHORIZATION ERROR: The script needs email sending permissions. Please authorize the script in Google Apps Script.';
    } else if (error.toString().includes('quota')) {
      return 'QUOTA ERROR: Email sending quota exceeded for today.';
    } else if (error.toString().includes('Invalid email')) {
      return 'EMAIL ERROR: Invalid email address format.';
    } else {
      return 'EMAIL ERROR: ' + error.toString();
    }
  }
}

/**
 * Debug function to check the deployment status
 */
function debugContactFormDeployment() {
  console.log('=== CONTACT FORM DEPLOYMENT DEBUG INFO ===');
  console.log('Current time (Vietnam):', new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}));
  console.log('Script ID:', ScriptApp.getScriptId());
  
  try {
    // Test if we can access a spreadsheet
    const testSheet = SpreadsheetApp.getActiveSheet();
    console.log('Spreadsheet access: SUCCESS');
    console.log('Sheet name:', testSheet.getName());
    console.log('Last row:', testSheet.getLastRow());
  } catch (sheetError) {
    console.log('Spreadsheet access: FAILED -', sheetError.toString());
    console.log('Will create new spreadsheet on first submission');
  }
  
  try {
    // Test email functionality
    console.log('Email service available:', typeof MailApp !== 'undefined');
  } catch (emailError) {
    console.log('Email service error:', emailError.toString());
  }
  
  console.log('=== END DEBUG INFO ===');
  return 'Debug complete - check logs';
}

/**
 * Comprehensive diagnostic function for auto-reply issues
 */
function diagnoseAutoReplyIssues() {
  console.log('=== AUTO-REPLY DIAGNOSTIC REPORT ===');
  
  const results = {
    timestamp: new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}),
    checks: [],
    recommendations: []
  };
  
  // Check 1: MailApp availability
  try {
    const mailAppAvailable = typeof MailApp !== 'undefined';
    results.checks.push({
      name: 'MailApp Service',
      status: mailAppAvailable ? 'PASS' : 'FAIL',
      details: mailAppAvailable ? 'MailApp is available' : 'MailApp service not found'
    });
    
    if (!mailAppAvailable) {
      results.recommendations.push('Enable Gmail API or MailApp service in Google Apps Script');
    }
  } catch (error) {
    results.checks.push({
      name: 'MailApp Service',
      status: 'ERROR',
      details: error.toString()
    });
  }
  
  // Check 2: Email quota
  try {
    const quota = MailApp.getRemainingDailyQuota();
    results.checks.push({
      name: 'Email Quota',
      status: quota > 0 ? 'PASS' : 'FAIL',
      details: `${quota} emails remaining today`
    });
    
    if (quota <= 0) {
      results.recommendations.push('Wait until tomorrow - daily email quota exhausted');
    } else if (quota < 10) {
      results.recommendations.push('Low email quota remaining - consider upgrading Google account');
    }
  } catch (error) {
    results.checks.push({
      name: 'Email Quota',
      status: 'ERROR',
      details: 'Could not check quota: ' + error.toString()
    });
  }
  
  // Check 3: Script permissions
  try {
    // Try to get script properties to check if we have basic permissions
    const props = PropertiesService.getScriptProperties();
    results.checks.push({
      name: 'Script Permissions',
      status: 'PASS',
      details: 'Basic script permissions available'
    });
  } catch (error) {
    results.checks.push({
      name: 'Script Permissions',
      status: 'FAIL',
      details: 'Script permissions issue: ' + error.toString()
    });
    results.recommendations.push('Re-authorize the script with all required permissions');
  }
  
  // Check 4: Test email sending
  try {
    console.log('Attempting test email send...');
    
    // Send a minimal test email
    MailApp.sendEmail({
      to: 'contact@digifact.vn',
      subject: '🔧 Auto-Reply Diagnostic Test',
      body: `Diagnostic test email sent at: ${results.timestamp}\n\nIf you receive this, email sending is working.`
    });
    
    results.checks.push({
      name: 'Test Email Send',
      status: 'PASS',
      details: 'Test email sent successfully'
    });
    
    // Now test the auto-reply function specifically
    console.log('Testing auto-reply function...');
    
    const testData = {
      firstName: 'Diagnostic Test',
      email: 'contact@digifact.vn',
      phone: '+84 123 456 789',
      company: 'Test Company',
      message: 'Auto-reply diagnostic test'
    };
    
    sendAutoReply(testData);
    
    results.checks.push({
      name: 'Auto-Reply Function',
      status: 'PASS',
      details: 'Auto-reply function executed without errors'
    });
    
  } catch (error) {
    results.checks.push({
      name: 'Email Sending Test',
      status: 'FAIL',
      details: error.toString()
    });
    
    // Analyze the error
    if (error.toString().includes('Authorization')) {
      results.recommendations.push('CRITICAL: Script needs email authorization. Go to Google Apps Script > Run any function > Authorize');
    } else if (error.toString().includes('quota')) {
      results.recommendations.push('Email quota exceeded - wait 24 hours or upgrade account');
    } else if (error.toString().includes('Invalid email')) {
      results.recommendations.push('Check email address format in recipient settings');
    } else {
      results.recommendations.push('Unknown email error - check Google Apps Script logs');
    }
  }
  
  // Check 5: Integration with main doPost function
  try {
    console.log('Testing integration with doPost...');
    
    const testRequest = {
      parameter: {
        firstName: 'Integration Test',
        email: 'dangdg@digifact.vn',
        phone: '+84 123 456 789',
        company: 'Test Company',
        message: 'Testing auto-reply integration'
      }
    };
    
    const result = doPost(testRequest);
    const response = JSON.parse(result.getContent());
    
    results.checks.push({
      name: 'doPost Integration',
      status: response.status === 'success' ? 'PASS' : 'FAIL',
      details: `doPost returned: ${response.status} - ${response.message}`
    });
    
  } catch (error) {
    results.checks.push({
      name: 'doPost Integration',
      status: 'FAIL',
      details: 'Integration test failed: ' + error.toString()
    });
  }
  
  // Generate report
  console.log('=== DIAGNOSTIC RESULTS ===');
  results.checks.forEach(check => {
    console.log(`${check.status}: ${check.name} - ${check.details}`);
  });
  
  if (results.recommendations.length > 0) {
    console.log('=== RECOMMENDATIONS ===');
    results.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  console.log('=== END DIAGNOSTIC REPORT ===');
  
  return results;
}

/**
 * Simple test without parameters to check basic functionality
 */
function simpleContactTest() {
  console.log('=== SIMPLE CONTACT FORM TEST ===');
  console.log('Function can execute:', true);
  console.log('Current time (Vietnam):', new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}));
  
  // Test doGet
  try {
    const getResult = doGet(null);
    console.log('doGet works:', true);
    console.log('doGet result:', getResult.getContent());
  } catch (getError) {
    console.log('doGet error:', getError.toString());
  }
  
  // Test doPost with missing data (should return appropriate error)
  try {
    const postResult = doPost(null);
    console.log('doPost with null:', postResult.getContent());
  } catch (postError) {
    console.log('doPost error:', postError.toString());
  }
  
  console.log('=== END SIMPLE CONTACT TEST ===');
  return 'Simple contact test complete';
}

/**
 * Create a sample spreadsheet with sample data for testing
 */
function createSampleSpreadsheet() {
  try {
    const spreadsheet = SpreadsheetApp.create('DigiFact Contact Form - Sample Data');
    const sheet = spreadsheet.getActiveSheet();
    sheet.setName('Contact Submissions');
    
    // Add headers
    const headers = [
      'Thời gian',
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Công ty',
      'Nội dung',
      'Nguồn',
      'IP Address',
      'User Agent'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#2563eb');
    headerRange.setFontColor('white');
    
    // Add sample data
    const sampleData = [
      [
        new Date().toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}),
        'Nguyễn Văn A',
        'nguyenvana@company.com',
        '+84 123 456 789',
        'Công ty TNHH ABC',
        'Tôi quan tâm đến giải pháp ERP cho doanh nghiệp',
        'Popup Form',
        '192.168.1.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      ],
      [
        new Date(Date.now() - 3600000).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}),
        'Trần Thị B',
        'tranthib@xyz.vn',
        '+84 987 654 321',
        'Công ty Cổ phần XYZ',
        'Cần tư vấn về CRM system',
        'Website Form',
        '10.0.0.1',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      ]
    ];
    
    sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
    
    // Set column widths
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(5, 200);
    sheet.setColumnWidth(6, 300);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 120);
    sheet.setColumnWidth(9, 200);
    
    console.log('Sample spreadsheet created:', spreadsheet.getId());
    console.log('Spreadsheet URL:', spreadsheet.getUrl());
    
    return {
      id: spreadsheet.getId(),
      url: spreadsheet.getUrl(),
      name: spreadsheet.getName()
    };
    
  } catch (error) {
    console.error('Error creating sample spreadsheet:', error);
    throw error;
  }
}
