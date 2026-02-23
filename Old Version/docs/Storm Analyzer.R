# Twisted Tornado Data Analysis
# R script for analyzing tornado correlations and patterns

library(ggplot2)
library(corrplot)
library(dplyr)
library(readr)
library(reshape2)

# Load tornado data
data <- read_csv("1.21.2 Twisted Risk Study (Responses) - Form Responses 1.csv")

# Clean column names
colnames(data) <- c("Timestamp", "CAPE", "SRH", "Lapse_0_3km", "PWAT", 
                   "Temperature", "Dewpoint", "CAPE_3km", "Lapse_3_6km", 
                   "Surface_RH", "RH_700_500", "Storm_Motion", "TVS_Peaks", "Max_Windspeed")

# Remove timestamp and convert to numeric
tornado_data <- data %>%
  select(-Timestamp) %>%
  mutate_all(as.numeric)

# Calculate correlation matrix
cor_matrix <- cor(tornado_data, use = "complete.obs")

# Create correlation plot
png("correlation_plot.png", width = 1200, height = 1000, res = 150)
corrplot(cor_matrix, method = "color", type = "upper", 
         order = "hclust", tl.cex = 0.8, tl.col = "black")
dev.off()

# Wind speed correlations
windspeed_cor <- cor_matrix[,"Max_Windspeed"]
windspeed_cor <- windspeed_cor[order(abs(windspeed_cor), decreasing = TRUE)]

print("Correlations with Max Windspeed:")
print(windspeed_cor)

# Create scatter plots for top correlations
top_features <- names(windspeed_cor)[2:4]  # Exclude windspeed itself

for(feature in top_features) {
  p <- ggplot(tornado_data, aes_string(x = feature, y = "Max_Windspeed")) +
    geom_point(alpha = 0.7, color = "blue") +
    geom_smooth(method = "lm", se = TRUE, color = "red") +
    labs(title = paste("Max Windspeed vs", feature),
         x = feature, y = "Max Windspeed (mph)") +
    theme_minimal()
  
  ggsave(paste0("windspeed_vs_", tolower(gsub("[^A-Za-z0-9]", "_", feature)), ".png"), 
         p, width = 8, height = 6, dpi = 150)
}

# Summary statistics
print("Summary Statistics:")
print(summary(tornado_data))

# Risk categorization
tornado_data$Risk_Level <- case_when(
  tornado_data$CAPE < 2500 & tornado_data$SRH < 300 ~ "Low",
  tornado_data$CAPE >= 2500 & tornado_data$CAPE < 4000 & tornado_data$SRH >= 300 & tornado_data$SRH < 500 ~ "Moderate",
  tornado_data$CAPE >= 4000 & tornado_data$CAPE < 6000 & tornado_data$SRH >= 500 & tornado_data$SRH < 700 ~ "High",
  tornado_data$CAPE >= 6000 & tornado_data$SRH >= 700 ~ "Extreme",
  TRUE ~ "Moderate"
)

# Risk level analysis
risk_summary <- tornado_data %>%
  group_by(Risk_Level) %>%
  summarise(
    Count = n(),
    Mean_Windspeed = mean(Max_Windspeed, na.rm = TRUE),
    SD_Windspeed = sd(Max_Windspeed, na.rm = TRUE),
    Min_Windspeed = min(Max_Windspeed, na.rm = TRUE),
    Max_Windspeed = max(Max_Windspeed, na.rm = TRUE)
  )

print("Risk Level Summary:")
print(risk_summary)

# Boxplot by risk level
p_risk <- ggplot(tornado_data, aes(x = Risk_Level, y = Max_Windspeed, fill = Risk_Level)) +
  geom_boxplot() +
  labs(title = "Windspeed Distribution by Risk Level",
       x = "Risk Level", y = "Max Windspeed (mph)") +
  theme_minimal() +
  scale_fill_brewer(type = "seq", palette = "YlOrRd")

ggsave("windspeed_by_risk_level.png", p_risk, width = 10, height = 6, dpi = 150)

print("Analysis complete! Check generated PNG files for visualizations.")