import { Container, Text, TextStyle } from "pixi.js";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants";
import { justPressed, Action } from "../input";
import type { Scene } from "./SceneManager";

export class TitleScene implements Scene {
  container: Container;
  private onStart: () => void;
  private blinkTimer = 0;
  private pressText: Text;

  constructor(onStart: () => void) {
    this.onStart = onStart;
    this.container = new Container();

    const titleStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 36,
      fill: 0x0060ff,
      fontWeight: "bold",
      stroke: { color: 0xffffff, width: 4 },
    });

    const title = new Text({ text: "SONIC PLATFORMER", style: titleStyle });
    title.anchor.set(0.5);
    title.x = SCREEN_WIDTH / 2;
    title.y = SCREEN_HEIGHT / 3;
    this.container.addChild(title);

    const pressStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 18,
      fill: 0xffffff,
    });

    this.pressText = new Text({
      text: "PRESS SPACE TO START",
      style: pressStyle,
    });
    this.pressText.anchor.set(0.5);
    this.pressText.x = SCREEN_WIDTH / 2;
    this.pressText.y = SCREEN_HEIGHT * 0.6;
    this.container.addChild(this.pressText);

    const controlsStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 12,
      fill: 0xcccccc,
    });

    const controls = new Text({
      text: "ARROWS / WASD: Move    SPACE / Z: Jump    DOWN + JUMP: Spin Dash",
      style: controlsStyle,
    });
    controls.anchor.set(0.5);
    controls.x = SCREEN_WIDTH / 2;
    controls.y = SCREEN_HEIGHT * 0.8;
    this.container.addChild(controls);
  }

  enter() {}
  exit() {}

  update(_dt: number) {
    this.blinkTimer++;
    if (justPressed(Action.Jump)) {
      this.onStart();
    }
  }

  render(_interpolation: number) {
    this.pressText.visible = Math.floor(this.blinkTimer / 30) % 2 === 0;
  }
}
