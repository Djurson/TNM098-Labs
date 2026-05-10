"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import cloud from "d3-cloud";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { TopicWord } from "@/lib/types";

interface D3WordCloudProps {
  words: TopicWord[];
  onWordClick: (word: string) => void;
  selectedWord: string | null;
  colors: Record<number, string>;
  selectedTopicId: number | null;
}

export default function D3WordCloud({
  words,
  onWordClick,
  selectedWord,
  colors,
  selectedTopicId,
}: D3WordCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const size = useResizeObserver(containerRef);

  useEffect(() => {
    if (!words.length || !svgRef.current || size.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = size.width;
    const height = size.height;

    // Create a color scale for the words
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Scale word sizes based on their "value" (LDA weight)
    const fontScale = d3
      .scaleLinear()
      .domain([d3.min(words, (w) => w.value) || 0, d3.max(words, (w) => w.value) || 1])
      .range([20, 70]); // Min font size 20px, Max font size 70px

    const layout = cloud()
      .size([width, height])
      .words(words.map((d) => ({ text: d.text, size: fontScale(d.value) })))
      .padding(5)
      .rotate(() => ~~(Math.random() * 2) * 90) // Randomly rotate 0 or 90 degrees
      .font("Inter, sans-serif")
      .fontSize((d) => d.size!)
      .on("end", draw);

    layout.start();

    function draw(computedWords: any[]) {
      const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

      g.selectAll("text")
        .data(computedWords)
        .enter()
        .append("text")
        .text((d) => d.text)
        .style("font-size", (d) => `${d.size}px`)
        .style("font-family", "Inter, sans-serif")
        .style("font-weight", (d) => (d.text === selectedWord ? "900" : "bold"))
        .style("fill", (d) => {
          if (d.text === selectedWord) return "#ef4444"; // Highlight red
          // Use the specific color for this topic from the props
          return selectedTopicId ? colors[selectedTopicId] : "#64748b";
        })
        .style("opacity", (d) => (selectedWord && d.text !== selectedWord ? 0.3 : 1))
        .attr("text-anchor", "middle")
        .attr("transform", (d) => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
        .text((d) => d.text)
        .style("cursor", "pointer")
        .style("transition", "opacity 0.2s")
        .on("mouseover", function (event, d) {
          if (selectedWord) {
            d3.select(this).style("opacity", d.text === selectedWord ? 1 : 0.5);
          } else {
            d3.select(this).style("opacity", 0.7);
          }
        })
        .on("mouseout", function (event, d) {
          const resetOpacity = selectedWord && d.text !== selectedWord ? 0.3 : 1;
          d3.select(this).style("opacity", resetOpacity);
        })
        .on("click", (event, d) => onWordClick(d.text));
    }
  }, [words, size, onWordClick, selectedWord, colors, selectedTopicId]);

  return (
    <div ref={containerRef} className="w-full h-87.5">
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  );
}
