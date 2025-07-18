/**
 * Google Apps Script for DigiFact Contact Popup Form
 * Receives customer information from contact-popup.html and saves to Google Sheets
 * SIMPLIFIED VERSION - Works around CORS limitations
 */

function doPost(e) {
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
      sendEmailNotification(data, vietnamTime);
      console.log('Email notification sent');
    } catch (emailError) {
      console.warn('Could not send email notification:', emailError);
      // Don't fail the whole request if email fails
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
    // Configure email settings - UPDATE THESE
    const recipient = 'contact@digifact.vn'; // Change to your email
    const ccRecipient = 'info@digifact.vn'; // Optional CC recipient
    const subject = `🔔 Liên hệ mới từ website - ${data.firstName}`;
    
    const body = `
Có liên hệ mới từ website DigiFact:

👤 THÔNG TIN KHÁCH HÀNG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Họ và tên: ${data.firstName}
• Email: ${data.email}
• Số điện thoại: ${data.phone || 'Không cung cấp'}
• Công ty: ${data.company || 'Không cung cấp'}

📝 NỘI DUNG LIÊN HỆ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.message || 'Khách hàng không để lại nội dung cụ thể'}

🕐 THÔNG TIN THÊM:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Thời gian: ${vietnamTime}
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
    
    // Send main email
    MailApp.sendEmail({
      to: recipient,
      cc: ccRecipient,
      subject: subject,
      body: body
    });
    
    // Send auto-reply to customer
    try {
      sendAutoReply(data);
    } catch (autoReplyError) {
      console.warn('Could not send auto-reply:', autoReplyError);
    }
    
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
}

/**
 * Send auto-reply email to customer
 */
function sendAutoReply(data) {
  try {
    const subject = '✅ Đã nhận được liên hệ của bạn - DigiFact';
    
    const body = `
Chào ${data.firstName},

Cảm ơn bạn đã liên hệ với DigiFact! 🙏

Chúng tôi đã nhận được thông tin liên hệ của bạn và sẽ phản hồi trong vòng 24 giờ làm việc.

📋 THÔNG TIN BẠN ĐÃ GỬI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Email: ${data.email}
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
• Hotline: +84 (0) XXX XXX XXX
• Website: https://digifact.vn

Trân trọng,
Đội ngũ DigiFact

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email này được gửi tự động. Vui lòng không reply email này.
    `;
    
    MailApp.sendEmail({
      to: data.email,
      subject: subject,
      body: body
    });
    
  } catch (error) {
    console.error('Error sending auto-reply:', error);
    throw error;
  }
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
 * Test function to verify the setup
 */
function testContactSubmission() {
  const testData = {
    firstName: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
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
