class LineBotClientOhamoni < LineBotClient
  def channel_secret
    ENV["LINE_CHANNEL_SECRET"] || Rails.application.credentials.line[:channel_secret]
  end

  def channel_token
    ENV["LINE_CHANNEL_TOKEN"] || Rails.application.credentials.line[:channel_token]
  end
end
