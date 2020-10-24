# どういうときに何を行うか知っている
class MapkunFinder

  SUPPORTED_HOSTS = [
    "tabelog.com"
  ]

  class << self
    def excuse(events: [])
      mapkun = Mapkun.new(events: events)
      event = events[0]
      text = event['message']['text']

      # 何をしてほしいかだけ意識

      # textが食べログとかのURLを含んでいたら位置情報取得して返す
      supported_urls = extract_supported_urls(text)
      unless supported_urls.empty?
        p "supported_urls", supported_urls
        # 店の地図情報を返信
        mapkun.reply_location_from_url(urls: supported_urls)
      end
    end

    private

    def extract_supported_urls(text)
      urls = URI.extract(text)
      urls.select do |url|
        uri = URI.parse(url)
        host = uri.host
        SUPPORTED_HOSTS.include?(host)
      end
    end
  end
end
