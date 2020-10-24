require 'open-uri'

class Scraper
  def initialize(url:)
    @url = url
    @doc = Nokogiri::HTML(URI.open(@url))
  end
end
