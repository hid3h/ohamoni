require "google/apis/sheets_v4"
require "googleauth"

class GoogleSheet

  SCOPE = ['https://www.googleapis.com/auth/spreadsheets']
  SPREADSHEET_ID = ''
  
  def initialize
    @service = Google::Apis::SheetsV4::SheetsService.new
    @service.authorization = authorizer
  end

  def authorizer
    Google::Auth::ServiceAccountCredentials.make_creds(
      json_key_io: File.open(''),
      scope: SCOPE
    )
  end

  def get_spreadsheet_values(range)
    @service.get_spreadsheet_values(SPREADSHEET_ID, range)
  end

  def append_spreadsheet_value(range, value_range, value_input_option:)
    @service.append_spreadsheet_value(SPREADSHEET_ID, range, value_range, value_input_option: value_input_option)
  end
end
