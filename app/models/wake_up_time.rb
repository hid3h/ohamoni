class WakeUpTime < ApplicationRecord
  belongs_to :user

  scope :recently, -> { order(woke_up_on: 'DESC') }
  # 先週の同じ曜日もみたいので実際は8日分
  scope :last_week, -> { where('woke_up_on <= ?', Time.zone.today).where('woke_up_on >= ?', Time.zone.today - 7.day) }

  class << self
    def wake_up(line_user_id:)
      user = User.find_or_create_by_line_user_id(line_user_id: line_user_id)

      text = 'おはようございます'
      begin
        user.wake_up_times.create(
          woke_up_on: Time.zone.today, # https://qiita.com/jnchito/items/cae89ee43c30f5d6fa2c#date%E3%81%AE%E5%A0%B4%E5%90%88
          woke_up_at: Time.zone.now
        )
      rescue ActiveRecord::RecordNotUnique
        text = '今日は既に記録済みです'
      end

      # 直近一週間取得
      wd = ["日", "月", "火", "水", "木", "金", "土"]
      weekly_data = user.wake_up_times.last_week.recently
      weekly_data_messages = weekly_data.map do |data|
        '・' + data.woke_up_on.day.to_s + '(' + wd[data.woke_up_on.wday] + ')' + data.woke_up_at.strftime("%H:%M")
      end

      # グラフ画像作成
      today = Time.zone.today
      labels = ((today - 7.day)..today).map do |date|
        date.strftime("%d(#{wd[date.wday]})")
      end
      # TODO データ入れる
      data = [1, nil, nil, nil, nil, nil, nil, nil]
      g = GruffCreater.new(labels: labels, data: data)
      filename = g.create

      {
        type: 'text',
        text: text + "\n\n直近の一週間の記録です\n" + weekly_data_messages.join("\n")
      }
      # host = Rails.env.production? ? "https://ohamoni.com" : "http://127.0.0.1:2000"
      # image_url = host + filename
      # p "image_url", image_url
      # {
      #   type: "image",
      #   originalContentUrl: image_url,
      #   previewImageUrl: image_url
      # }
    end
  end
end
