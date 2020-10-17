require 'gruff'

class GruffCreater
  def initialize(labels: [], data: [])
    @g = Gruff::Line.new
    @g.font = 'NotoSansJP-Regular.otf'
    @g.theme_37signals

    label_hash = {}
    labels.each_with_index do |l, i|
      label_hash[i] = l
    end

    @label_hash = label_hash
    @data       = data
  end

  def create
    # @g.title = 'Wow!  Look at this!'
    @g.labels = @label_hash
    @g.data(:起床時刻, @data)
    id = SecureRandom.alphanumeric
    @g.write("public/uploads/img/#{id}.png")
    "/uploads/img/#{id}.png"
  end
end
