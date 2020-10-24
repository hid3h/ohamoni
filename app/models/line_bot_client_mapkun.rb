class LineBotClientMapkun < LineBotClient
  def channel_secret
    ENV["LINE_CHANNEL_MAPKUN_SECRET"] || Rails.application.credentials.line[:channel_mapkun_secret]
  end

  def channel_token
    ENV["LINE_CHANNEL_MAPKUN_TOKEN"] || Rails.application.credentials.line[:channel_mapkun_token]
  end
end
