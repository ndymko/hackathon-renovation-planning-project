package io.neverending25.api.service;

import io.neverending25.api.client.ParserClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class APIService {
    private final ParserClient parserClient;
    private final ObjectMapper objectMapper;
    private final PlanService planService;

    public Map<String, Object> parse(Map<String, Object> body) {
        String imageBase64 = body.get("image").toString();
        return parserClient.parse(imageBase64);
    }

    public Map<String, Object> sendPlanToLlama(Map<String, Object> currentPlan) {
        String planJson = objectMapper.writeValueAsString(currentPlan);

        String prompt = String.format("""
You are a floor plan analyzer that enhances architectural plans.

INPUT FLOOR PLAN:
%s

YOUR TASK:
1. Preserve ALL existing data (walls, rooms, area, perimeter) - DO NOT modify anything
2. Analyze room connectivity: identify rooms that have no door access
3. Add NEW doors for EVERY room that is isolated (has no adjacent door)
4. Identify load-bearing walls (longest structural walls, typically >100 units)

DOOR PLACEMENT ALGORITHM:
- For each room in the rooms array, check if there's a door nearby in the doors array
- If no door exists within 50 units of room coordinates, the room is isolated
- Add a door in the closest wall segment to that room
- Door dimensions: width 20-35 units, height 6-10 units
- Door format: {"bbox": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]} where points form a rectangle

LOAD-BEARING WALL CRITERIA:
- Walls with length > 100 units
- Exterior perimeter walls
- Long vertical or horizontal structural walls
- Select 4-6 walls total

REQUIRED OUTPUT STRUCTURE:
{
  "walls": [...exact copy from input...],
  "doors": [...existing doors + new doors for ALL isolated rooms...],
  "rooms": [...exact copy from input...],
  "area": 157212,
  "perimeter": 6753.35,
  "load_bearing_walls": [
    {"position": [[x1,y1],[x2,y2]]},
    {"position": [[x3,y3],[x4,y4]]},
    ...4-6 walls total...
  ]
}

CRITICAL REQUIREMENTS:
- Add doors for EVERY isolated room, not just one
- Maintain exact JSON structure from input
- Return only valid JSON, no additional text
- Ensure all arrays are properly formatted (no nested arrays)

EXAMPLE:
If room at (201,251) is isolated, add door:
{"bbox": [[210,251],[235,251],[235,257],[210,257]]}

If room at (258,370) is isolated, add door:
{"bbox": [[203,370],[228,370],[228,376],[203,376]]}

Return JSON:
""", planJson);

        Map<String, Object> result = sendToLlama(prompt);

        if (result.get("valid").equals("true")) {
            planService.createPlan(currentPlan);
        }

        return result;
    }

    public Map<String, Object> validatePlanViaLlama(Map<String, Object> body) {
        Map<String, Object> result = sendPlanToLlama(body);
        String planJson = objectMapper.writeValueAsString(result);

        String prompt = String.format("""
You are a building code compliance validator for Russian Federation (ЖК РФ).

INPUT FLOOR PLAN:
%s

VALIDATION CHECKLIST:
1. Room Accessibility: Can all rooms be reached via doors?
2. Fire Safety: Are there adequate emergency exits?
3. Circulation: Is there a proper corridor/hallway system?
4. Sanitary Access: Are bathrooms/toilets accessible?
5. Building Code: Does layout comply with ЖК РФ standards?

ANALYSIS METHOD:
- Check each room in rooms array
- Verify door exists near room coordinates (within 50 units)
- Identify any isolated/blocked rooms
- Check structural integrity
- Verify minimum room dimensions

OUTPUT FORMAT:
{
  "valid": false,
  "issues": [
    {
      "description": "Room 5 at coordinates (258,370) is isolated with no door access",
      "location": [[258,370],[258,407]]
    },
    {
      "description": "Room 16 at coordinates (201,251) has no connecting door to main corridor",
      "location": [[201,251],[258,303]]
    }
  ],
  "good": [
    {
      "description": "Main entrance properly positioned with adequate width",
      "location": [[102,40],[137,51]]
    },
    {
      "description": "Central corridor provides access to multiple rooms",
      "location": null
    }
  ],
  "suggestions": [
    {
      "description": "Add 90cm door from main corridor to Room 5 for accessibility",
      "move_door": {
        "from": null,
        "to": [[203,370],[228,370]]
      },
      "remove_wall": null
    },
    {
      "description": "Install door between corridor and Room 16 at wall segment",
      "move_door": {
        "from": null,
        "to": [[210,251],[235,251]]
      },
      "remove_wall": null
    },
    {
      "description": "Consider removing non-load-bearing wall to improve circulation",
      "move_door": null,
      "remove_wall": {
        "position": [[226,251],[258,251]]
      }
    }
  ]
}

VALIDATION RULES:
- valid: false if ANY critical issues found (isolated rooms, code violations)
- valid: true only if all rooms accessible and code-compliant
- issues: list ALL problems with specific coordinates
- good: list positive aspects (minimum 1-2 items even if issues exist)
- suggestions: provide actionable fixes with exact coordinates
- All coordinate arrays must be [[x1,y1],[x2,y2]] format
- move_door/remove_wall can be null if not applicable

RESPONSE REQUIREMENTS:
- Return ONLY valid JSON
- Include at least 1-2 items in each array (issues, good, suggestions)
- Provide specific coordinates when possible
- Be detailed in descriptions (mention room numbers, dimensions)
- Prioritize accessibility and safety issues

Return JSON:
""", planJson);

        return sendToLlama(prompt);
    }

    public Map<String, Object> llm(Map<String, Object> body) {
        String prompt = body.get("prompt").toString();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "llama3");
        requestBody.put("prompt", prompt);
        requestBody.put("stream", false);
        requestBody.put("options", Map.of("temperature", 0));

        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> response = restTemplate.postForObject(
                "http://localhost:11434/api/generate",
                requestBody,
                Map.class
        );

        String responseText = (String) response.get("response");

        Map<String, Object> result = new HashMap<>();
        result.put("response", responseText);
        return result;
    }

    private Map<String, Object> sendToLlama(String prompt) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "llama3");
        requestBody.put("prompt", prompt);
        requestBody.put("options", Map.of("temperature", 0));
        requestBody.put("format", "json");
        requestBody.put("stream", false);

        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> response = restTemplate.postForObject(
                "http://localhost:11434/api/generate",
                requestBody,
                Map.class
        );

        String responseText = (String) response.get("response");

        int start = responseText.indexOf("{");
        int end = responseText.lastIndexOf("}");
        if (start != -1 && end != -1 && end > start) {
            responseText = responseText.substring(start, end + 1);
        }

        Map<String, Object> llamaJson = objectMapper.readValue(responseText, Map.class);

        return llamaJson;
    }
}