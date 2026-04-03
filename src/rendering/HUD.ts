import { Container, Text, TextStyle } from "pixi.js"

export class HUD {
  container: Container
  private scoreText: Text
  private ringsText: Text
  private timeText: Text
  private levelText: Text
  private startTime = 0

  constructor() {
    this.container = new Container()

    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fill: 0xffffff,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 3 },
    })

    this.scoreText = new Text({ text: "SCORE: 0", style })
    this.scoreText.x = 10
    this.scoreText.y = 10

    this.ringsText = new Text({ text: "RINGS: 0", style })
    this.ringsText.x = 10
    this.ringsText.y = 30

    this.timeText = new Text({ text: "TIME: 0:00", style })
    this.timeText.x = 350
    this.timeText.y = 10

    this.levelText = new Text({ text: "", style })
    this.levelText.x = 350
    this.levelText.y = 30

    this.container.addChild(this.scoreText)
    this.container.addChild(this.ringsText)
    this.container.addChild(this.timeText)
    this.container.addChild(this.levelText)

    this.startTime = performance.now()
  }

  reset() {
    this.startTime = performance.now()
  }

  update(score: number, rings: number, levelName: string) {
    this.scoreText.text = `SCORE: ${score}`
    this.ringsText.text = `RINGS: ${rings}`
    this.levelText.text = levelName

    const elapsed = Math.floor((performance.now() - this.startTime) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    this.timeText.text = `TIME: ${mins}:${secs.toString().padStart(2, "0")}`
  }
}
