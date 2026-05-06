// Keep this generic type for your ChartTooltip component
export type TooltipData = {
  title: string;
  details: { label: string; value: string | number }[];
};

export interface TimelineData {
  Date: string;
  Total_Reports: number;
  Filtered_Reports: number;
  // Dynamic topic columns based on your LDA model
  Topic_1: number;
  Topic_2: number;
  Topic_3: number;
}

export interface ReportData {
  ID: number;
  Date: string;
  Title: string;
  Content: string;
  Dominant_Topic: number;
}

export interface TopicWord {
  text: string;
  value: number;
}

export interface TopicData {
  topic_id: number;
  top_words: TopicWord[];
}
