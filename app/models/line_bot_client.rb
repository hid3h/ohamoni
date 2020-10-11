class LineBotClient
  def initialize
    @client = Line::Bot::Client.new { |config|
      config.channel_secret = Rails.application.credentials.line[:channel_secret]
      config.channel_token  = Rails.application.credentials.line[:channel_token]
    }
  end

  def get_profile(user_id)
    response = @client.get_profile(user_id)
    JSON.parse(response.body)
  end

  def reply_message(reply_token:, message:)
    @client.reply_message(reply_token, message)
  end
end
