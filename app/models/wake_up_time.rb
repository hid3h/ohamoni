class WakeUpTime
  class << self
    def wake_up(line_user_id:)
      # ユーザー検索
      # user = User.find_or_create_by_line_user_id(line_user_id: line_user_id)

      text = 'おはようございます'
      # TODO 保存処理
      # user.wake_up_times.create(
      #   # TODO 日付は日本時間になっているか？
      #   woke_up_on: Time.zone.today, # https://qiita.com/jnchito/items/cae89ee43c30f5d6fa2c#date%E3%81%AE%E5%A0%B4%E5%90%88
      #   woke_up_at: Time.zone.now
      # )
      # text = '今日は既に記録済みです'

      # TODO 直近一週間取得

      {
        type: 'text',
        text: text + "\n\n直近の一週間の記録です\n"
      }
    end
  end
end
