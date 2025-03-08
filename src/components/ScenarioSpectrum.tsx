import { useEffect, useRef, useState, ReactNode } from 'react';
import { Box, Typography, Paper, Grid, Chip, Collapse, Tooltip } from '@mui/material';
import * as d3 from 'd3';
import { Scenario, Component } from '../store/negotiationSlice';

interface ScenarioSpectrumProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
  selectedScenarioId?: string;
  component?: Component;
  party1Name?: string;
  party2Name?: string;
  riskAssessmentContent?: ReactNode;
}

// Scenario type names mapping
const getScenarioTypeNames = (party1Name: string, party2Name: string) => ({
  'redline_violated_p1': `${party1Name} Redline Violated`,
  'bottomline_violated_p1': `${party1Name} Bottomline Violated`,
  'agreement_area': 'Agreement Area',
  'bottomline_violated_p2': `${party2Name} Bottomline Violated`,
  'redline_violated_p2': `${party2Name} Redline Violated`
});

const ScenarioSpectrum = ({ 
  scenarios, 
  onSelectScenario, 
  selectedScenarioId,
  component,
  party1Name = 'Party 1',
  party2Name = 'Party 2',
  riskAssessmentContent
}: ScenarioSpectrumProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scenarioPositions, setScenarioPositions] = useState<{[key: string]: {x: number, y: number}}>({}); 
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);
  
  // Get scenario type names with current party names
  const scenarioTypeNames = getScenarioTypeNames(party1Name, party2Name);

  // Get scenario by type
  const getScenarioByType = (type: string) => {
    return scenarios.find(s => s.type === type);
  };
  
  // Color mapping for scenario types
  const getColorForType = (type: string) => {
    switch (type) {
      case 'redline_violated_p1':
        return "#ff5252";
      case 'bottomline_violated_p1':
        return "#ff9800";
      case 'agreement_area':
        return "#4caf50";
      case 'bottomline_violated_p2':
        return "#ff9800";
      case 'redline_violated_p2':
        return "#ff5252";
      default:
        return "#ccc";
    }
  };

  // Get scenario name based on type
  const getScenarioName = (type: string, index: number) => {
    return `Scenario ${index + 1}: ${scenarioTypeNames[type as keyof typeof scenarioTypeNames] || type}`;
  };
  
  useEffect(() => {
    if (!svgRef.current || scenarios.length === 0) return;
    
    const width = svgRef.current.clientWidth;
    const height = 120;
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };

    // Clear existing content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Create scale - reversed order again
    const xScale = d3.scaleLinear()
      .domain([0, scenarios.length - 1])
      .range([width - margin.right, margin.left]);

    // Add risk label - moved higher and aligned left with arrow
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", 15)
      .attr("text-anchor", "start")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(`Increasing risk for ${party2Name} →`);  // Added arrow

    // Create the spectrum line group
    const spectrumGroup = svg.append("g")
      .attr("transform", `translate(0, ${height/2})`);

    // Add "Zone of Possible Agreement" background
    const zopaWidth = (xScale(1) - xScale(3)); // Positions 2,3,4 in reversed order
    spectrumGroup.append("rect")
      .attr("x", xScale(3))
      .attr("y", -15)
      .attr("width", zopaWidth)
      .attr("height", 30)
      .attr("fill", "rgba(0, 255, 0, 0.1)")
      .attr("rx", 15);

    // Add ZOPA label
    svg.append("text")
      .attr("x", xScale(2))
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .attr("font-size", "10px")
      .text("Zone of Possible Agreement");

    // Add horizontal line
    spectrumGroup.append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2);

    // Reverse scenarios order
    const displayScenarios = [...scenarios].reverse().map((scenario, index) => ({
      ...scenario,
      displayNumber: index + 1
    }));

    // Add dots for each scenario
    spectrumGroup.selectAll("circle")
      .data(displayScenarios)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => xScale(i))
      .attr("cy", 0)
      .attr("r", d => d.id === selectedScenarioId ? 8 : 6)
      .attr("fill", d => {
        const color = d.type.includes('redline') ? '#ff4444' : 
                     d.type.includes('bottomline') ? '#ffaa00' : 
                     '#44aa44';
        return d.id === selectedScenarioId ? color : `${color}80`;
      })
      .attr("class", "scenario-dot")
      .style("cursor", "pointer")
      .style("transition", "all 0.3s ease")
      .style("filter", d => {
        if (d.id === selectedScenarioId) {
          const color = d.type.includes('redline') ? '#ff4444' : 
                       d.type.includes('bottomline') ? '#ffaa00' : 
                       '#44aa44';
          return `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 6px ${color})`;
        }
        return "none";
      })
      .on("click", (event, d) => onSelectScenario(d))
      .on("mouseover", (event, d) => setHoveredScenario(d.id))
      .on("mouseout", () => setHoveredScenario(null));

    // Add scenario numbers
    spectrumGroup.selectAll("text.scenario-number")
      .data(displayScenarios)
      .enter()
      .append("text")
      .attr("class", "scenario-number")
      .attr("x", (d, i) => xScale(i))
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(d => d.displayNumber);

    // Add labels - party1 on left, party2 on right
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", height - 5)
      .attr("text-anchor", "start")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(party1Name);  // Changed to party1Name

    svg.append("text")
      .attr("x", width - margin.right)
      .attr("y", height - 5)
      .attr("text-anchor", "end")
      .attr("fill", "#666")
      .attr("font-size", "12px")
      .text(party2Name);  // Changed to party2Name

    // Store the positions of the circles for connecting lines
    const positions: {[key: string]: {x: number, y: number}} = {};
    scenarios.forEach((scenario, i) => {
      positions[scenario.id] = {
        x: xScale(i) + margin.left,
        y: 30 + margin.top
      };
    });
    setScenarioPositions(positions);
    
  }, [scenarios, selectedScenarioId, party1Name, party2Name]);
  
  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        {/* Spectrum visualization */}
        <svg ref={svgRef} style={{ width: '100%', height: '120px' }} />
      </Paper>
      
      {/* Scenario boxes - vertically stacked */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {scenarios.map((scenario, index) => {  {/* Removed reverse() */}
          const isSelected = selectedScenarioId === scenario.id;
          
          return (
            <Box key={scenario.id}>
              <Tooltip title={isSelected ? "Click to deselect" : ""} placement="top">
                <div>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2,
                      cursor: 'pointer',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderWidth: isSelected ? 2 : 1,
                      bgcolor: 'background.paper',
                      opacity: selectedScenarioId && !isSelected ? 0.6 : 1,
                      transition: 'opacity 0.3s, border-color 0.3s',
                      position: 'relative',
                      '&:hover': {
                        opacity: 1,
                        borderColor: isSelected ? 'primary.dark' : 'primary.light',
                        bgcolor: 'background.paper',
                      }
                    }}
                    onClick={() => onSelectScenario(scenario)}
                    id={`scenario-box-${scenario.id}`}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          bgcolor: getColorForType(scenario.type),
                          mr: 1,
                          boxShadow: isSelected ? '0 0 6px rgba(255,255,255,0.8)' : 'none'
                        }} 
                      />
                      <Typography variant="subtitle2" sx={{ 
                        color: getColorForType(scenario.type),
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}>
                        {getScenarioName(scenario.type, index)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', pl: 3 }}>
                      {scenario.description}
                    </Typography>
                  </Paper>
                </div>
              </Tooltip>
              
              {isSelected && riskAssessmentContent && (
                <Box 
                  sx={{ 
                    ml: 4,
                    mt: 1, 
                    borderLeft: `2px solid ${getColorForType(scenario.type)}`,
                    pl: 2
                  }}
                >
                  {riskAssessmentContent}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ScenarioSpectrum; 