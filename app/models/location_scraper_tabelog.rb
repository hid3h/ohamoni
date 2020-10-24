module LocationScraperTabelog
  def title
    @doc.css('.p-header__title > h1')[0].text
  end

  def address
    @doc.css('.rstinfo-table__address')[0].text
  end

  def latitude
    query_hash['lat']
  end

  def longitude
    query_hash['lng']
  end

  private

  def data_print_url
    @data_print_url ||= @doc.css('.js-rstinfo-print-popup')[0].attribute('data-print-url').value
  end

  def query_hash
    uri = URI.parse(data_print_url)
    Rack::Utils.parse_nested_query(uri.query)
  end
end
