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
const scenarioTypeNames = {
  'redline_violated_p1': 'Health for All (HfA) Redline Violated',
  'bottomline_violated_p1': 'Health for All (HfA) Bottomline Violated',
  'agreement_area': 'Agreement Area',
  'bottomline_violated_p2': 'Ministry of Health Bottomline Violated',
  'redline_violated_p2': 'Ministry of Health Redline Violated'
};

// Create a reversed mapping for scenario types to match the new order
const reversedTypeOrder = [
  'redline_violated_p2',
  'bottomline_violated_p2',
  'agreement_area',
  'bottomline_violated_p1',
  'redline_violated_p1'
];

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

  // Get scenario name based on type with the new numbering (1-5 from left to right)
  const getScenarioName = (type: string, index: number) => {
    // Get the position in the reversed order (1-5 from left to right)
    const position = reversedTypeOrder.indexOf(type) + 1;
    return `Scenario ${position}: ${scenarioTypeNames[type as keyof typeof scenarioTypeNames] || type}`;
  };
  
  useEffect(() => {
    if (!svgRef.current || scenarios.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = svgRef.current.clientWidth;
    const height = 100; // Increased height
    const margin = { top: 30, right: 40, bottom: 30, left: 40 }; // Increased all margins
    const innerWidth = width - margin.left - margin.right;
    
    // Set viewBox to ensure all content is visible, with extra space for the markers at 100px distance
    svg.attr("viewBox", `-120 -10 ${width + 240} ${height + 20}`)
       .attr("preserveAspectRatio", "xMidYMid meet");
    
    // Create a scale for the spectrum - reversed order (5,4,3,2,1 from left to right)
    // Add some padding on the left and right to ensure dots at the edges have enough space
    const x = d3.scaleLinear()
      .domain([0, 4])  // 5 scenarios (0-4)
      .range([20, innerWidth - 20]); // Add 20px padding on each side
    
    // Create the main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create a risk gradient
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "risk-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#4caf50") // Green (low risk)
      .attr("stop-opacity", 0.7);
      
    gradient.append("stop")
      .attr("offset", "50%")
      .attr("stop-color", "#ff9800") // Orange (medium risk)
      .attr("stop-opacity", 0.7);
      
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#f44336") // Red (high risk)
      .attr("stop-opacity", 0.7);
    
    // Draw the line with gradient
    g.append("line")
      .attr("x1", 0)
      .attr("y1", 30)
      .attr("x2", innerWidth)
      .attr("y2", 30)
      .attr("stroke", "url(#risk-gradient)")
      .attr("stroke-width", 3);
    
    // Add ZOPA indication (for scenarios 2, 3, 4 which are indices 3, 2, 1 in reversed order)
    g.append("rect")
      .attr("x", x(1)) // Start at scenario 4 (index 1 in reversed order)
      .attr("y", 25)
      .attr("width", x(3) - x(1)) // Width spans from scenario 4 to scenario 2
      .attr("height", 10)
      .attr("fill", "rgba(0, 128, 0, 0.2)") // Light green background
      .attr("rx", 5) // Rounded corners
      .attr("ry", 5);
    
    // Add ZOPA text
    g.append("text")
      .attr("x", (x(1) + x(3)) / 2) // Center between scenario 4 and scenario 2
      .attr("y", 60) // Adjusted for new height
      .attr("text-anchor", "middle")
      .attr("fill", "#006400") // Dark green text
      .style("font-size", "11px") // Slightly larger
      .style("font-weight", "bold")
      .text("Zone of Possible Agreement (ZOPA)");
    
    // Add risk indicator text at the top of the spectrum
    g.append("text")
      .attr("x", innerWidth)
      .attr("y", -15) // Position it higher up
      .attr("text-anchor", "end")
      .attr("fill", "#d32f2f") // Red text
      .style("font-size", "14px") // Slightly larger
      .style("font-weight", "bold")
      .text("Increasing Risk →");
    
    // Add ideal position label for Party 2 (right side) with arrow
    g.append("text")
      .attr("x", x(4) + 100) // Aligned with the 100 value
      .attr("y", 70) // Below the spectrum
      .attr("text-anchor", "end")
      .attr("fill", "#1976d2") // Blue text
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(`Ideal for ${party2Name} →`);
      
    // Add ideal position label for Party 1 (left side) with arrow
    g.append("text")
      .attr("x", x(0) - 100) // Aligned with the 100 value
      .attr("y", 70) // Below the spectrum
      .attr("text-anchor", "start")
      .attr("fill", "#1976d2") // Blue text
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(`← Ideal for ${party1Name}`);
    
    // Add small vertical lines connecting to the spectrum
    g.append("line")
      .attr("x1", x(0) - 100) // Aligned with the 100 value
      .attr("y1", 30) // Spectrum line y-position
      .attr("x2", x(0) - 100) // Aligned with the 100 value
      .attr("y2", 55) // Just above the text
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3"); // Dashed line
      
    g.append("line")
      .attr("x1", x(4) + 100) // Aligned with the 100 value
      .attr("y1", 30) // Spectrum line y-position
      .attr("x2", x(4) + 100) // Aligned with the 100 value
      .attr("y2", 55) // Just above the text
      .attr("stroke", "#1976d2")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3,3"); // Dashed line
    
    // Draw the scenario points in reversed order
    const circles = g.selectAll("circle")
      .data(scenarios)
      .enter()
      .append("circle")
      .attr("cx", (d, i) => {
        // Find the index of this scenario's type in the reversed order
        const typeIndex = reversedTypeOrder.indexOf(d.type);
        return x(typeIndex >= 0 ? typeIndex : i);
      })
      .attr("cy", 30)
      .attr("r", d => selectedScenarioId === d.id ? 12 : 10) // Larger radius for selected dot
      .attr("fill", d => getColorForType(d.type))
      .attr("fill-opacity", d => selectedScenarioId ? (selectedScenarioId === d.id ? 1 : 0.4) : 1) // Make unselected dots transparent
      .attr("stroke", "none") // No stroke for any dot
      .attr("class", d => `scenario-point-${d.id}`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        onSelectScenario(d);
      });
    
    // Add a highlight effect for the selected dot
    if (selectedScenarioId) {
      const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
      if (selectedScenario) {
        const typeIndex = reversedTypeOrder.indexOf(selectedScenario.type);
        const cx = x(typeIndex >= 0 ? typeIndex : 0);
        
        // Add a glow effect for the selected dot with expanded dimensions to prevent cropping
        const glowFilter = svg.append("defs")
          .append("filter")
          .attr("id", "glow")
          .attr("x", "-200%")
          .attr("y", "-200%")
          .attr("width", "500%")
          .attr("height", "500%");
          
        glowFilter.append("feGaussianBlur")
          .attr("stdDeviation", "2") // Reduced blur for smaller glow
          .attr("result", "coloredBlur");
          
        const feMerge = glowFilter.append("feMerge");
        feMerge.append("feMergeNode")
          .attr("in", "coloredBlur");
        feMerge.append("feMergeNode")
          .attr("in", "SourceGraphic");
        
        // Add a pulsing highlight circle behind the selected dot
        g.append("circle")
          .attr("cx", cx)
          .attr("cy", 30)
          .attr("r", 16) // Smaller radius
          .attr("fill", "none")
          .attr("stroke", getColorForType(selectedScenario.type))
          .attr("stroke-width", 3) // Thinner stroke
          .attr("opacity", 0.7) // Slightly less opaque
          .attr("filter", "url(#glow)")
          .attr("class", "highlight-pulse");
          
        // Add a CSS animation for the pulsing effect
        const style = document.createElement("style");
        style.textContent = `
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 0.5; }
            100% { transform: scale(1); opacity: 0.7; }
          }
          .highlight-pulse {
            animation: pulse 2s infinite ease-in-out;
            transform-origin: center;
            transform-box: fill-box;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    // Add small labels for the points (numbers 1-5 from left to right)
    g.selectAll("text.point-label")
      .data(scenarios)
      .enter()
      .append("text")
      .attr("class", "point-label")
      .attr("x", (d, i) => {
        // Find the index of this scenario's type in the reversed order
        const typeIndex = reversedTypeOrder.indexOf(d.type);
        return x(typeIndex >= 0 ? typeIndex : i);
      })
      .attr("y", 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#000")
      .style("font-size", "9px")
      .text((d, i) => {
        // Find the index of this scenario's type in the reversed order
        const typeIndex = reversedTypeOrder.indexOf(d.type);
        return typeIndex >= 0 ? typeIndex + 1 : i + 1;
      });
    
    // Store the positions of the circles for connecting lines
    const positions: {[key: string]: {x: number, y: number}} = {};
    scenarios.forEach((scenario, i) => {
      // Find the index of this scenario's type in the reversed order
      const typeIndex = reversedTypeOrder.indexOf(scenario.type);
      positions[scenario.id] = {
        x: x(typeIndex >= 0 ? typeIndex : i) + margin.left,
        y: 30 + margin.top
      };
    });
    setScenarioPositions(positions);
    
    // Add more visible triangular markers at each end of the spectrum
    // Party 1 ideal position marker (left)
    g.append("path")
      .attr("d", d3.symbol().type(d3.symbolTriangle).size(150))
      .attr("transform", `translate(${x(0) - 100}, 30) rotate(270)`)
      .attr("fill", "#1976d2")
      .attr("opacity", 0.8);
      
    // Party 2 ideal position marker (right)
    g.append("path")
      .attr("d", d3.symbol().type(d3.symbolTriangle).size(150))
      .attr("transform", `translate(${x(4) + 100}, 30) rotate(90)`)
      .attr("fill", "#1976d2")
      .attr("opacity", 0.8);
    
  }, [scenarios, selectedScenarioId, party1Name, party2Name]);
  
  return (
    <Box ref={containerRef} sx={{ position: 'relative' }}>
      <Paper variant="outlined" sx={{ p: 3, mb: 2, px: 6 }}>
        {/* Spectrum visualization */}
        <svg ref={svgRef} width="100%" height="100"></svg>
      </Paper>
      
      {/* Scenario boxes - now vertically stacked and ordered by the reversed type order */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Sort scenarios based on the reversed type order */}
        {[...scenarios].sort((a, b) => {
          const indexA = reversedTypeOrder.indexOf(a.type);
          const indexB = reversedTypeOrder.indexOf(b.type);
          return indexA - indexB;
        }).map((scenario, index) => {
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
                      borderWidth: isSelected ? 3 : 1,
                      bgcolor: 'background.paper',
                      opacity: selectedScenarioId && !isSelected ? 0.4 : 1,
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      boxShadow: isSelected ? '0 0 8px rgba(0, 0, 0, 0.2)' : 'none',
                      '&:hover': {
                        opacity: 1,
                        borderColor: isSelected ? 'primary.dark' : 'primary.light',
                        bgcolor: 'background.paper',
                        transform: isSelected ? 'none' : 'translateY(-2px)',
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
                          border: 'none'
                        }} 
                      />
                      <Typography variant="subtitle2" sx={{ 
                        color: getColorForType(scenario.type),
                        fontWeight: 'bold',
                        fontSize: '0.85rem' // Decreased font size
                      }}>
                        {getScenarioName(scenario.type, index)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', pl: 3 }}> {/* Decreased font size and added left padding */}
                      {scenario.description}
                    </Typography>
                  </Paper>
                </div>
              </Tooltip>
              
              {/* Risk Assessment Content - only show for selected scenario */}
              {isSelected && riskAssessmentContent && (
                <Box 
                  sx={{ 
                    ml: 4, // Indent to create scaffolded appearance
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