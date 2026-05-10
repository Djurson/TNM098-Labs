"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Cloud, AlertTriangle, SearchX } from "lucide-react";

import D3Timeline from "@/components/D3Timeline";
import D3WordCloud from "@/components/D3WordCloud";

import timelineData from "@/public/data/timeline_data.json";
import reportsData from "@/public/data/reports_data.json";
import topicsData from "@/public/data/topics_data.json";

export default function Dashboard() {
  //const [activeTab, setActiveTab] = useState<string>("timeline");

  // Timeline States
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Topic States
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  // Derive the active topic data for the Word Cloud
  const currentTopicData = topicsData.find((t) => t.topic_id === selectedTopicId)?.top_words || [];

  const topicLabels: Record<number, string> = {
    1: "Aviation & Games",
    2: "Forensics/Explosives",
    3: "City Threats (Network of Dread)",
  };

  const topicColors: Record<number, string> = {
    1: "#3b82f6", // Blue (Aviation/Games)
    2: "#10b981", // Green (Forensics)
    3: "#f59e0b", // Amber (City Threats)
  };

  // Step 9: Global Additive Filtering Logic
  let displayedReports = reportsData;

  // 1. Filter by Date if selected
  if (selectedDate) {
    displayedReports = displayedReports.filter((report) => report.Date === selectedDate);
  }

  // 2. Filter by Topic if selected
  if (selectedTopicId !== null) {
    displayedReports = displayedReports.filter(
      (report) => report.Dominant_Topic === selectedTopicId,
    );
  }

  // 3. Filter by Word if selected
  if (selectedWord) {
    displayedReports = displayedReports.filter((report) =>
      report.Content.toLowerCase().includes(selectedWord.toLowerCase()),
    );
  }

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-screen bg-slate-50">
      {/* Left Column: Visualizations Stacked Vertically */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        {/* 1. Temporal Distribution Card */}
        <Card>
          <CardHeader>
            <CardTitle>Reporting Density Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compare total reports vs. filtered threat reports. Click a bar to view specific
              reports.
            </p>
          </CardHeader>
          <CardContent>
            <D3Timeline
              data={timelineData}
              selectedDate={selectedDate}
              selectedTopicId={selectedTopicId}
              colors={topicColors}
              onDateClick={(date) => {
                // Functional update ensures we compare against the ABSOLUTE latest state
                setSelectedDate((prevDate) => (prevDate === date ? null : date));
              }}
            />
          </CardContent>
        </Card>

        {/* 2. Topic Word Cloud Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>LDA Topic Models</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select a topic to view its top words. Click a word to filter the reports.
              </p>
            </div>
            {/* Topic Selector Buttons */}
            <div className="flex gap-2">
              {[1, 2, 3].map((id) => (
                <Button
                  key={id}
                  variant={selectedTopicId === id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // 2. Toggle logic: if clicking the same ID, set to null
                    const newId = selectedTopicId === id ? null : id;
                    setSelectedTopicId(newId);
                    setSelectedWord(null); // Clear word filter when topic changes or deselects
                  }}>
                  {topicLabels[id]}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {selectedTopicId ? (
              <D3WordCloud
                words={currentTopicData}
                onWordClick={setSelectedWord}
                selectedWord={selectedWord}
                selectedTopicId={selectedTopicId}
                colors={topicColors}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] border-2 border-dashed rounded-lg text-slate-400">
                <p>Select a topic above to explore key terms</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Step 9 Context Drill-down */}
      <Card className="lg:col-span-4 flex flex-col h-150 lg:h-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-500" />
            Relevant Reports
          </CardTitle>
          {/* Clear Filters Button */}
          {(selectedDate || selectedWord) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDate(null);
                setSelectedWord(null);
              }}>
              Clear Filters
            </Button>
          )}
        </CardHeader>

        <div className="px-6 pb-2 flex flex-wrap gap-2">
          {/* If a date is selected, show the badge */}
          {selectedDate && (
            <Badge variant="destructive" className="justify-center">
              Date: {selectedDate}
            </Badge>
          )}

          {/* If a topic is selected, show the badge */}
          {selectedTopicId && (
            <Badge variant="default" className="justify-center">
              Viewing: {topicLabels[selectedTopicId as keyof typeof topicLabels]}
            </Badge>
          )}

          {/* If a word is selected, show the badge */}
          {selectedWord && (
            <Badge
              variant="secondary"
              className="justify-center border-blue-500 text-blue-700 bg-blue-50">
              Contains: "{selectedWord}"
            </Badge>
          )}
        </div>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-6">
            <div className="space-y-6 pb-6 mt-4">
              {displayedReports.map((report) => (
                <div
                  key={report.ID}
                  className="flex flex-col gap-2 pb-4 border-b border-slate-100 last:border-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-sm leading-tight text-slate-900">
                      {report.Title}
                    </h3>
                    <Badge variant="outline" className="ml-2 whitespace-nowrap bg-slate-100">
                      Topic {report.Dominant_Topic}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-slate-500">{report.Date}</p>
                  <p className="text-sm text-slate-700 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">
                    {report.Content}
                  </p>
                </div>
              ))}
              {displayedReports.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <SearchX className="size-8 mb-2 opacity-50" />
                  <p>No reports match your filters.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
