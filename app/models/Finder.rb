class Finder

  WAKE_UP_MESSAGE = '起きた'

  class << self
    def excuse(events: [])
      event = events[0]
      text = event['message']['text']

      case text
      when WAKE_UP_MESSAGE then
        wake_up_time = WakeUpTime.new(line_user_id: event['source']['userId'])
        message_hash = wake_up_time.wake_up
        
        line_bot_client.reply_message(
          reply_token: event['replyToken'],
          message: message_hash
        )
      end
    end

    private

    def line_bot_client
      @line_bot_client ||= LineBotClient.new
    end
  end
end
