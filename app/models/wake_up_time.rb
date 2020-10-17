class WakeUpTime < Dynamo

  TABLE_NAME = 'wake_up_times_dev'

  def initialize(line_user_id:)
    super(table_name: TABLE_NAME)
    @line_user_id = line_user_id
  end

  def wake_up
    text = 'おはようございます'
    
    woke_up_on = Time.zone.today.to_s
    begin
      item = {
        line_user_id: @line_user_id,
        woke_up_on: woke_up_on,
        woke_up_at: Time.zone.now.to_s,
      }
      option = {
        condition_expression: "attribute_not_exists(#H)"\
          " and attribute_not_exists(#R)",
        expression_attribute_names: {
          "#H" => "line_user_id", # 書き方ここを見た https://github.com/aws/aws-sdk-ruby-record/blob/master/spec/aws-record/record/item_operations_spec.rb#L70
          "#R" => "woke_up_on"
        }
      }
      put_item(
        item: item,
        option: option
      )
    rescue Aws::DynamoDB::Errors::ConditionalCheckFailedException
      text = '今日は既に記録済みです'
    end

    # 直近一週間取得
    condition = {
      expression_attribute_values: {
        line_user_id: @line_user_id
      }
    }
    p query(condition: condition)

    {
      type: 'text',
      text: text + "\n\n直近の一週間の記録です\n"
    }
  end
end
