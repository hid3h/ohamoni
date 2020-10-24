class Mapkun < LineBotClientMapkun

  def initialize(events:)
    super()
    event = events[0]
    @reply_token = event['replyToken']
  end

  def reply_location_from_url(urls: [])
    return if urls.empty?
    # 複数含まれているときどうしよう.とりあえず先頭のひとつだけ対応
    url = urls[0]

    scraper = LocationScraper.new(url: url)
    message_hash = {
      type:      'location',
      title:     scraper.title,
      address:   scraper.address,
      latitude:  scraper.latitude,
      longitude: scraper.longitude
    }
    p "message_hash", message_hash

    reply_message(
      reply_token: @reply_token,
      message: message_hash
    )
  end
end
