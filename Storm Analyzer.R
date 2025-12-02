# ==============================================================================
# 🌪️ TWISTED PROBABILITY ENGINE (ENHANCED VISUALIZATION)
# ==============================================================================

library(ggplot2)
library(gridExtra)
library(grid)

# ==============================================================================
# 1. INPUT FUNCTION
# ==============================================================================

get_user_data <- function() {
  cat("\n=================================================\n")
  cat("     ENTER THERMODYNAMICS DATA \n")
  cat("=================================================\n")
  
  ask <- function(prompt_text) {
    val <- readline(prompt = paste0(prompt_text, " > "))
    return(as.numeric(val))
  }
  
  stp <- ask("STP (Significant Tornado Param)")
  vtp <- ask("VTP (Violent Tornado Param)")
  cape <- ask("CAPE (J/KG)")
  srh <- ask("SRH (m2/s2)")
  temp <- ask("Temperature (F)")
  dew <- ask("Dewpoint (F)")
  rh <- ask("Surface RH (%)")
  lapse <- ask("0-3KM Lapse Rate")
  pwat <- ask("PWAT (in)")
  speed <- ask("Storm Speed (mph)")
  
  return(list(
    STP = stp, VTP = vtp, CAPE = cape, SRH = srh,
    TEMP = temp, DEWPOINT = dew, SURFACE_RH = rh,
    LAPSE_RATE_0_3 = lapse, PWAT = pwat, STORM_SPEED = speed
  ))
}

# ==============================================================================
# 2. PROBABILITY LOGIC ENGINE
# ==============================================================================

calculate_probabilities <- function(data) {
  
  scores <- c(
    "WEDGE" = 5,
    "STOVEPIPE" = 10,
    "DRILLBIT" = 5,
    "CONE" = 20,
    "ROPE" = 5,
    "SIDEWINDER" = 0,
    "MULTI-VORTEX" = 5
  )
  
  temp_spread <- data$TEMP - data$DEWPOINT
  
  # Moisture
  is_soupy <- (temp_spread <= 5) & (data$SURFACE_RH >= 80)
  is_dry <- (temp_spread >= 15) & (data$SURFACE_RH <= 60)
  
  # Energy  
  is_high_cape <- (data$CAPE >= 5000)
  is_low_cape <- (data$CAPE <= 2500)
  
  # Shear / Suction
  is_extreme_srh <- (data$SRH >= 450)
  is_violent_lapse <- (data$LAPSE_RATE_0_3 >= 9.5)
  is_wedge_lapse <- (data$LAPSE_RATE_0_3 >= 7.5 & data$LAPSE_RATE_0_3 <= 9.0)
  
  # Motion factors
  is_fast <- (data$STORM_SPEED > 60)
  is_hypersonic <- (data$STORM_SPEED > 75)
  
  # WEDGE
  if (is_soupy) scores["WEDGE"] <- scores["WEDGE"] + 50
  if (is_high_cape) scores["WEDGE"] <- scores["WEDGE"] + 20
  if (is_wedge_lapse) scores["WEDGE"] <- scores["WEDGE"] + 15
  if (is_hypersonic & !is_soupy) scores["WEDGE"] <- scores["WEDGE"] - 10
  
  # DRILLBIT
  if (is_dry) scores["DRILLBIT"] <- scores["DRILLBIT"] + 40
  if (is_violent_lapse) scores["DRILLBIT"] <- scores["DRILLBIT"] + 30
  if (is_fast) scores["DRILLBIT"] <- scores["DRILLBIT"] + 20
  if (is_hypersonic) scores["DRILLBIT"] <- scores["DRILLBIT"] + 15
  
  # SIDEWINDER
  if (is_extreme_srh & is_violent_lapse) scores["SIDEWINDER"] <- scores["SIDEWINDER"] + 40
  if (is_hypersonic) scores["SIDEWINDER"] <- scores["SIDEWINDER"] + 40
  if (data$VTP >= 3) scores["SIDEWINDER"] <- scores["SIDEWINDER"] + 20
  
  # STOVEPIPE
  if (data$LAPSE_RATE_0_3 > 8.5) scores["STOVEPIPE"] <- scores["STOVEPIPE"] + 30
  if (is_high_cape & !is_soupy) scores["STOVEPIPE"] <- scores["STOVEPIPE"] + 20
  
  # MULTI-VORTEX
  if (is_extreme_srh) scores["MULTI-VORTEX"] <- scores["MULTI-VORTEX"] + 40
  if (data$SRH > 600) scores["MULTI-VORTEX"] <- scores["MULTI-VORTEX"] + 50
  
  # ROPE
  if (is_low_cape & !is_hypersonic) scores["ROPE"] <- scores["ROPE"] + 50
  
  total_score <- sum(scores)
  percentages <- round((scores / total_score) * 100, 1)
  df <- data.frame(Type = names(percentages), Prob = as.numeric(percentages))
  df <- df[df$Prob > 0, ]
  return(df)
}

# ==============================================================================
# 3. ENHANCED PLOTTING ENGINE
# ==============================================================================

analyze_and_plot <- function(data) {
  prob_df <- calculate_probabilities(data)
  
  # Wind Logic
  est_min <- 0; est_max <- 0; label_int <- ""
  if (data$VTP >= 4) { 
    est_min <- 290; est_max <- 320; label_int <- "EF5 (THEORETICAL MAX)" 
  } else if (data$VTP == 3) { 
    est_min <- 260; est_max <- 310; label_int <- "EF5 (CATASTROPHIC)" 
  } else if (data$VTP == 2) { 
    est_min <- 190; est_max <- 230; label_int <- "EF4 (VIOLENT)" 
  } else { 
    est_min <- 130; est_max <- 160; label_int <- "EF2/EF3 (STRONG)" 
  }
  
  # Enhanced Wind Scale Plot
  wind_df <- data.frame(
    Level = c("EF0-1", "EF2-3", "EF4", "EF5"), 
    Start = c(65, 111, 166, 200), 
    End = c(110, 165, 199, 320), 
    Color = c("#66bb6a", "#ffd54f", "#ff8a65", "#ef5350")
  )
  
  p1 <- ggplot() + 
    geom_rect(data = wind_df, 
              aes(xmin=Start, xmax=End, ymin=0, ymax=1, fill=Color), 
              alpha=0.6) + 
    geom_segment(aes(x=est_min, xend=est_max, y=0.5, yend=0.5), 
                 color="white", size=3, lineend="round") + 
    geom_point(aes(x=(est_min+est_max)/2, y=0.5), 
               color="white", size=8, shape=18) + 
    scale_fill_identity() + 
    scale_x_continuous(limits = c(0, 350), 
                       breaks = c(65, 111, 166, 200, 300),
                       labels = c("65", "111", "166", "200", "300")) + 
    labs(title = paste("🌪️", label_int), 
         subtitle = paste("Estimated Wind Speed (Might not be accurate):", est_min, "-", est_max, "mph")) + 
    theme_minimal() + 
    theme(
      plot.background = element_rect(fill = "#1a1a1a", color = NA),
      panel.background = element_rect(fill = "#1a1a1a", color = NA),
      panel.grid = element_blank(),
      text = element_text(color = "white", size=14, face="bold"),
      axis.text.x = element_text(color = "grey70", size = 10),
      axis.text.y = element_blank(),
      axis.title = element_blank(),
      plot.title = element_text(hjust = 0.5, color="white", size=18, margin=margin(b=5)),
      plot.subtitle = element_text(hjust = 0.5, color="grey80", size=12),
      plot.margin = margin(20, 20, 20, 20)
    )
  
  # Enhanced Probability Bar Chart
  p2 <- ggplot(prob_df, aes(x = reorder(Type, Prob), y = Prob)) + 
    geom_col(aes(fill = Prob), width = 0.75, alpha = 0.9) + 
    scale_fill_gradientn(
      colors = c("#1e88e5", "#26c6da", "#66bb6a", "#ffa726", "#ef5350"),
      values = scales::rescale(c(0, 25, 50, 75, 100))
    ) +
    coord_flip() + 
    geom_text(aes(label = paste0(Prob, "%")), 
              hjust = -0.15, 
              color = "white", 
              size = 5.5, 
              fontface = "bold") + 
    scale_y_continuous(limits = c(0, max(prob_df$Prob) * 1.15),
                       breaks = seq(0, 100, 25)) +
    labs(title = "TORNADO MORPHOLOGY PROBABILITY DISTRIBUTION") + 
    theme_minimal() + 
    theme(
      plot.background = element_rect(fill = "#1a1a1a", color = NA),
      panel.background = element_rect(fill = "#1a1a1a", color = NA),
      panel.grid.major.x = element_line(color = "grey25", size = 0.3),
      panel.grid.major.y = element_blank(),
      panel.grid.minor = element_blank(),
      text = element_text(color = "white"),
      axis.text.y = element_text(hjust = 1, size=13, face="bold", color="grey90"),
      axis.text.x = element_text(size=10, color="grey70"),
      axis.title = element_blank(),
      plot.title = element_text(hjust = 0.5, size=16, face="bold", 
                                color="white", margin=margin(b=15)),
      plot.margin = margin(20, 30, 20, 20),
      legend.position = "none"
    )
  
  # Arrange plots with better spacing
  grid.arrange(p1, p2, ncol = 1, heights = c(1.5, 3))
}

# ==============================================================================
# 4. EXECUTION
# ==============================================================================
user_inputs <- get_user_data()
analyze_and_plot(user_inputs)