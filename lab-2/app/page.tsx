"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";

import D3Timeline from "@/components/D3Timeline";
import D3WordCloud from "@/components/D3WordCloud";

import timelineData from "@/public/data/timeline_data.json";
import reportsData from "@/public/data/reports_data.json";
import topicsData from "@/public/data/topics_data.json";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Record<string | number, boolean>>({});

  const toggleReportExpansion = (id: string | number) => setExpandedReports((prev) => ({ ...prev, [id]: !prev[id] }));

  const currentTopicData = topicsData.find((t) => t.topic_id === selectedTopicId)?.top_words || [];

  const topicLabels: Record<number, string> = {
    1: "Airlines",
    2: "Forensics/Explosives",
    3: "City Threats (Network of Dread)",
    4: "Topic 4",
    5: "Topic 5",
  };

  const topicColors: Record<number, string> = {
    1: "#3b82f6", // Blue
    2: "#10b981", // Green
    3: "#f59e0b", // Amber
    4: "#4f46e5",
    5: "#facc15",
  };

  // Step 9: Filtering Logic
  const filteredReports = useMemo(() => {
    return reportsData.filter((report) => {
      const matchesTopic = selectedTopicId ? report.Dominant_Topic === selectedTopicId : true;
      const matchesDate = selectedDate ? report.Date === selectedDate : true;
      const matchesWord = selectedWord ? report.Content.toLowerCase().includes(selectedWord.toLowerCase()) : true;
      return matchesTopic && matchesDate && matchesWord;
    });
  }, [selectedTopicId, selectedDate, selectedWord]);

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-screen bg-slate-50">
      {/* LEFT COLUMN */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reporting Density Over Time</CardTitle>
            <p className="text-sm text-muted-foreground">Compare total reports vs. filtered threat reports.</p>
          </CardHeader>
          <CardContent>
            <D3Timeline data={timelineData} selectedDate={selectedDate} selectedTopicId={selectedTopicId} colors={topicColors} onDateClick={(date) => setSelectedDate((prev) => (prev === date ? null : date))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>LDA Topic Models</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Select a topic to explore keywords.</p>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((id) => (
                <Button
                  key={id}
                  variant={selectedTopicId === id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedTopicId(selectedTopicId === id ? null : id);
                    setSelectedWord(null);
                  }}
                  className="gap-2">
                  {topicLabels[id]}
                  <div className="size-2 rounded-full" style={{ background: topicColors[id] }} />
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {selectedTopicId ? (
              <D3WordCloud words={currentTopicData} onWordClick={setSelectedWord} selectedWord={selectedWord} selectedTopicId={selectedTopicId} colors={topicColors} />
            ) : (
              <div className="flex items-center justify-center h-75 border-2 border-dashed rounded-lg text-slate-400">
                <p>Select a topic above to explore key terms</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Step 9 Drill-down */}
      <Card className="lg:col-span-4 flex flex-col h-179">
        <CardHeader className="border-b space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Relevant Reports
            </CardTitle>
            <Badge variant="secondary">{filteredReports.length} total</Badge>
          </div>

          {/* ACTIVE FILTER CHIPS (New feature) */}
          <div className="flex flex-wrap gap-2 min-h-6">
            {/* Topic Filter Chip */}
            {selectedTopicId && (
              <Badge variant="outline" className="gap-2 bg-white rounded-full px-3 py-1 text-[11px] font-medium transition-all border-blue-500 text-blue-500" style={{ borderColor: topicColors[selectedTopicId], color: topicColors[selectedTopicId] }}>
                {topicLabels[selectedTopicId]}
                <button onClick={() => setSelectedTopicId(null)} className="hover:bg-slate-100 rounded-full p-0.5 transition-colors">
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Date Filter Chip */}
            {selectedDate && (
              <Badge variant="outline" className="gap-2 bg-white border-blue-500 text-blue-500 rounded-full px-3 py-1 text-[11px] font-medium">
                {selectedDate}
                <button onClick={() => setSelectedDate(null)} className="hover:bg-blue-50 rounded-full p-0.5 transition-colors">
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            {/* Word Filter Chip */}
            {selectedWord && (
              <Badge variant="outline" className="gap-2 bg-white border-red-500 text-red-700 rounded-full px-3 py-1 text-[11px] font-medium">
                "{selectedWord}"
                <button onClick={() => setSelectedWord(null)} className="hover:bg-red-50 rounded-full p-0.5 transition-colors">
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto pt-4 custom-scrollbar">
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const isExpanded = expandedReports[report.ID];
              return (
                <div
                  key={report.ID}
                  className={`p-3 border-l-4 rounded-r-md transition-all cursor-pointer ${isExpanded ? "bg-white shadow-md border-slate-400" : "bg-slate-50 hover:bg-slate-100 border-transparent"}`}
                  style={{ borderLeftColor: topicColors[report.Dominant_Topic] }}
                  onClick={() => toggleReportExpansion(report.ID)}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm leading-tight pr-4">{report.Title}</h4>
                    {isExpanded ? <ChevronUp className="size-4 shrink-0 text-slate-400" /> : <ChevronDown className="size-4 shrink-0 text-slate-400" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2 uppercase font-medium">
                    {report.Date} • Topic {report.Dominant_Topic}
                  </p>
                  <p className={`text-xs text-slate-600 leading-relaxed ${!isExpanded && "line-clamp-3"}`}>{report.Content}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
