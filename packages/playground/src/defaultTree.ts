import type { VirtualEntry, VirtualFileSystem } from "@webgal/language-service";

const treeJson = {
	type: "dir",
	children: {
		animation: {
			type: "dir",
			children: {
				"animationTable.json": {
					type: "file",
					content:
						'[\r\n  "enter-from-left",\r\n  "enter-from-bottom",\r\n  "enter-from-right",\r\n  "shake",\r\n  "move-front-and-back",\r\n  "enter",\r\n  "exit",\r\n  "blur",\r\n  "oldFilm",\r\n  "dotFilm",\r\n  "reflectionFilm",\r\n  "glitchFilm",\r\n  "rgbFilm",\r\n  "godrayFilm",\r\n  "removeFilm",\r\n  "shockwaveIn",\r\n  "shockwaveOut"\r\n]\r\n'
				},
				"blur.json": {
					type: "file",
					content: ""
				},
				"dotFilm.json": {
					type: "file",
					content: ""
				},
				"enter-from-bottom.json": {
					type: "file",
					content: ""
				},
				"enter-from-left.json": {
					type: "file",
					content: ""
				},
				"enter-from-right.json": {
					type: "file",
					content: ""
				},
				"enter.json": {
					type: "file",
					content: ""
				},
				"exit.json": {
					type: "file",
					content: ""
				},
				"glitchFilm.json": {
					type: "file",
					content: ""
				},
				"godrayFilm.json": {
					type: "file",
					content: ""
				},
				"move-front-and-back.json": {
					type: "file",
					content: ""
				},
				"oldFilm.json": {
					type: "file",
					content: ""
				},
				"reflectionFilm.json": {
					type: "file",
					content: ""
				},
				"removeFilm.json": {
					type: "file",
					content: ""
				},
				"rgbFilm.json": {
					type: "file",
					content: ""
				},
				"shake.json": {
					type: "file",
					content: ""
				},
				"shockwaveIn.json": {
					type: "file",
					content: ""
				},
				"shockwaveOut.json": {
					type: "file",
					content: ""
				}
			}
		},
		background: {
			type: "dir",
			children: {
				"bg.png": {
					type: "file",
					content: ""
				},
				"bg.webp": {
					type: "file",
					content: ""
				},
				"WebGalEnter.png": {
					type: "file",
					content: ""
				},
				"WebGalEnter.webp": {
					type: "file",
					content: ""
				},
				"WebGAL_New_Enter_Image.png": {
					type: "file",
					content: ""
				},
				"WebGAL_New_Enter_Image.webp": {
					type: "file",
					content: ""
				}
			}
		},
		bgm: {
			type: "dir",
			children: {
				"s_Title.mp3": {
					type: "file",
					content: ""
				}
			}
		},
		"config.txt": {
			type: "file",
			content: ""
		},
		figure: {
			type: "dir",
			children: {
				"1": {
					type: "dir",
					children: {
						"closed_eyes.png": {
							type: "file",
							content: ""
						},
						"closed_eyes.webp": {
							type: "file",
							content: ""
						},
						"closed_mouth.png": {
							type: "file",
							content: ""
						},
						"closed_mouth.webp": {
							type: "file",
							content: ""
						},
						"halfopen_mouth.png": {
							type: "file",
							content: ""
						},
						"halfopen_mouth.webp": {
							type: "file",
							content: ""
						},
						"open_eyes.png": {
							type: "file",
							content: ""
						},
						"open_eyes.webp": {
							type: "file",
							content: ""
						},
						"open_mouth.png": {
							type: "file",
							content: ""
						},
						"open_mouth.webp": {
							type: "file",
							content: ""
						}
					}
				},
				"2": {
					type: "dir",
					children: {
						"closed_eyes.png": {
							type: "file",
							content: ""
						},
						"closed_eyes.webp": {
							type: "file",
							content: ""
						},
						"closed_mouth.png": {
							type: "file",
							content: ""
						},
						"closed_mouth.webp": {
							type: "file",
							content: ""
						},
						"halfopen_mouth.png": {
							type: "file",
							content: ""
						},
						"halfopen_mouth.webp": {
							type: "file",
							content: ""
						},
						"open_eyes.png": {
							type: "file",
							content: ""
						},
						"open_eyes.webp": {
							type: "file",
							content: ""
						},
						"open_mouth.png": {
							type: "file",
							content: ""
						},
						"open_mouth.webp": {
							type: "file",
							content: ""
						}
					}
				},
				"3": {
					type: "dir",
					children: {
						"closed_eyes.png": {
							type: "file",
							content: ""
						},
						"closed_eyes.webp": {
							type: "file",
							content: ""
						},
						"closed_mouth.png": {
							type: "file",
							content: ""
						},
						"closed_mouth.webp": {
							type: "file",
							content: ""
						},
						"halfopen_mouth.png": {
							type: "file",
							content: ""
						},
						"halfopen_mouth.webp": {
							type: "file",
							content: ""
						},
						"open_eyes.png": {
							type: "file",
							content: ""
						},
						"open_eyes.webp": {
							type: "file",
							content: ""
						},
						"open_mouth.png": {
							type: "file",
							content: ""
						},
						"open_mouth.webp": {
							type: "file",
							content: ""
						}
					}
				},
				"miniavatar.png": {
					type: "file",
					content: ""
				},
				"miniavatar.webp": {
					type: "file",
					content: ""
				},
				"stand.png": {
					type: "file",
					content: ""
				},
				"stand.webp": {
					type: "file",
					content: ""
				},
				"stand2.png": {
					type: "file",
					content: ""
				},
				"stand2.webp": {
					type: "file",
					content: ""
				}
			}
		},
		scene: {
			type: "dir",
			children: {
				"demo_animation.txt": {
					type: "file",
					content: ""
				},
				"demo_changeConfig.txt": {
					type: "file",
					content: ""
				},
				"demo_en.txt": {
					type: "file",
					content: ""
				},
				"demo_escape.txt": {
					type: "file",
					content: ""
				},
				"demo_ja.txt": {
					type: "file",
					content: ""
				},
				"demo_performs.txt": {
					type: "file",
					content: ""
				},
				"demo_var.txt": {
					type: "file",
					content: ""
				},
				"demo_zh_cn.txt": {
					type: "file",
					content: ""
				},
				"function_test.txt": {
					type: "file",
					content: ""
				},
				"start.txt": {
					type: "file",
					content: ""
				}
			}
		},
		template: {
			type: "dir",
			children: {
				Stage: {
					type: "dir",
					children: {
						Choose: {
							type: "dir",
							children: {
								"choose.scss": {
									type: "file",
									content: ""
								}
							}
						},
						TextBox: {
							type: "dir",
							children: {
								"textbox.scss": {
									type: "file",
									content: ""
								}
							}
						}
					}
				},
				"template.json": {
					type: "file",
					content: ""
				},
				UI: {
					type: "dir",
					children: {
						Title: {
							type: "dir",
							children: {
								"title.scss": {
									type: "file",
									content: ""
								}
							}
						}
					}
				}
			}
		},
		tex: {
			type: "dir",
			children: {
				"cherryBlossoms.png": {
					type: "file",
					content: ""
				},
				"cherryBlossoms.webp": {
					type: "file",
					content: ""
				},
				"rain.png": {
					type: "file",
					content: ""
				},
				"raindrop.png": {
					type: "file",
					content: ""
				},
				"snow.png": {
					type: "file",
					content: ""
				},
				"snowFlake_min.png": {
					type: "file",
					content: ""
				}
			}
		},
		"userStyleSheet.css": {
			type: "file",
			content: ""
		},
		video: {
			type: "dir",
			children: {}
		},
		vocal: {
			type: "dir",
			children: {
				"001_小夜SAYO（ノーマル）_こんにちは。.wav": {
					type: "file",
					content: ""
				},
				"002_小夜SAYO（ノーマル）_ウェブギャルへよう….wav": {
					type: "file",
					content: ""
				},
				"003_小夜SAYO（ノーマル）_ウェブギャルは、か….wav": {
					type: "file",
					content: ""
				},
				"004_小夜SAYO（ノーマル）_Web技術を使用し….wav": {
					type: "file",
					content: ""
				},
				"005_小夜SAYO（ノーマル）_この機能のおかげで….wav": {
					type: "file",
					content: ""
				},
				"006_小夜SAYO（ノーマル）_いつでも、どこでも….wav": {
					type: "file",
					content: ""
				},
				"007_小夜SAYO（ノーマル）_とっても、魅力的で….wav": {
					type: "file",
					content: ""
				},
				"008_小夜SAYO（ノーマル）_さらに、ウェブギャ….wav": {
					type: "file",
					content: ""
				},
				"009_小夜SAYO（ノーマル）_例えば、特殊効果と….wav": {
					type: "file",
					content: ""
				},
				"010_小夜SAYO（ノーマル）_こんな感じに、ウェ….wav": {
					type: "file",
					content: ""
				},
				"011_小夜SAYO（ノーマル）_機能の紹介は以上で….wav": {
					type: "file",
					content: ""
				},
				"012_小夜SAYO（ノーマル）_次に、ウェブギャル….wav": {
					type: "file",
					content: ""
				},
				"013_小夜SAYO（ノーマル）_興味があれば、引き….wav": {
					type: "file",
					content: ""
				},
				"014_小夜SAYO（ノーマル）_ウェブギャルは、よ….wav": {
					type: "file",
					content: ""
				},
				"015_小夜SAYO（ノーマル）_当初のウェブギャル….wav": {
					type: "file",
					content: ""
				},
				"016_小夜SAYO（ノーマル）_長きにわたる開発期….wav": {
					type: "file",
					content: ""
				},
				"017_小夜SAYO（ノーマル）_さらに、ウェブギャ….wav": {
					type: "file",
					content: ""
				},
				"018_小夜SAYO（ノーマル）_このデモゲームで使….wav": {
					type: "file",
					content: ""
				},
				"019_小夜SAYO（ノーマル）_ウェブギャルプロジ….wav": {
					type: "file",
					content: ""
				},
				"020_小夜SAYO（ノーマル）_ウェブギャルの開発….wav": {
					type: "file",
					content: ""
				},
				"021_小夜SAYO（ノーマル）_そのため、彼女は3….wav": {
					type: "file",
					content: ""
				},
				"022_小夜SAYO（ノーマル）_ウェブギャルのスク….wav": {
					type: "file",
					content: ""
				},
				"023_小夜SAYO（ノーマル）_ウェブギャルプロジ….wav": {
					type: "file",
					content: ""
				},
				"024_小夜SAYO（ノーマル）_ウェブギャルプロジ….wav": {
					type: "file",
					content: ""
				},
				"025_小夜SAYO（ノーマル）_メニューのログボタ….wav": {
					type: "file",
					content: ""
				},
				"026_小夜SAYO（ノーマル）_豊富な設定、クイッ….wav": {
					type: "file",
					content: ""
				},
				"027_小夜SAYO（ノーマル）_もちろん、これらの….wav": {
					type: "file",
					content: ""
				},
				"028_小夜SAYO（ノーマル）_初めてゲームを開発….wav": {
					type: "file",
					content: ""
				},
				"029_小夜SAYO（ノーマル）_ですから、心配せず….wav": {
					type: "file",
					content: ""
				},
				"030_小夜SAYO（ノーマル）_ウェブギャルプロジ….wav": {
					type: "file",
					content: ""
				},
				"031_小夜SAYO（ノーマル）_リンクを1つ用意す….wav": {
					type: "file",
					content: ""
				},
				"032_小夜SAYO（ノーマル）_ウェブギャルプロジ….wav": {
					type: "file",
					content: ""
				},
				"e001_Hello.mp3": {
					type: "file",
					content: ""
				},
				"e002_Welcome_to_WebGAL.mp3": {
					type: "file",
					content: ""
				},
				"e003_WebGAL_is_a_completely_new_web.mp3": {
					type: "file",
					content: ""
				},
				"e004_It_is_an_engine_developedusing_web.mp3": {
					type: "file",
					content: ""
				},
				"e005_Thanks_to_this_ feature_once.mp3": {
					type: "file",
					content: ""
				},
				"e006_Very attractive.mp3": {
					type: "file",
					content: ""
				},
				"e007_In_addition_ WebGAL_allows you.mp3": {
					type: "file",
					content: ""
				},
				"e008_For_example_let's_make.mp3": {
					type: "file",
					content: ""
				},
				"e009_As_you_can see_WebGAL.mp3": {
					type: "file",
					content: ""
				},
				"e010_That's_all_for_the_feature introduction.mp3": {
					type: "file",
					content: ""
				},
				"e011_Next_I_will introduce_the_ history.mp3": {
					type: "file",
					content: ""
				},
				"e012_WebGAL _was_developed to_make_it_ easier.mp3": {
					type: "file",
					content: ""
				},
				"e013_Initially_ WebGAL_had_very_few_features.mp3": {
					type: "file",
					content: ""
				},
				"e014_After_a_long _development period.mp3": {
					type: "file",
					content: ""
				},
				"e015_Additionally,_the release_of_the WebGAL_editor.mp3": {
					type: "file",
					content: ""
				},
				"e016_The_WebGAL project_has reached_1000.mp3": {
					type: "file",
					content: ""
				},
				"e017_The_development process_of WebGAL_is_a process.mp3": {
					type: "file",
					content: ""
				},
				"e018_WebGAL's _scripting language_was designed_from the_ground.mp3":
					{
						type: "file",
						content: ""
					},
				"e019_The_WebGAL_project_supports_many_keyboard shortcuts.mp3":
					{
						type: "file",
						content: ""
					},
				"e020_Try_pressing the_Backlog button.mp3": {
					type: "file",
					content: ""
				},
				"e021_Features_like_quick_save_quick_load.mp3": {
					type: "file",
					content: ""
				},
				"e022_For developers_who_ are_developing_ games.mp3": {
					type: "file",
					content: ""
				},
				"e023_So_you_can_ start_making_ games_quickly.mp3": {
					type: "file",
					content: ""
				},
				"e024_We_hope_ that_your_work.mp3": {
					type: "file",
					content: ""
				},
				"e025_Thank_you_ for_your_interest_in_the_WebGAL_project!.mp3":
					{
						type: "file",
						content: ""
					},
				"v1.wav": {
					type: "file",
					content: ""
				},
				"v10.wav": {
					type: "file",
					content: ""
				},
				"v11.wav": {
					type: "file",
					content: ""
				},
				"v12.wav": {
					type: "file",
					content: ""
				},
				"v13.wav": {
					type: "file",
					content: ""
				},
				"v14.wav": {
					type: "file",
					content: ""
				},
				"v15.wav": {
					type: "file",
					content: ""
				},
				"v16.wav": {
					type: "file",
					content: ""
				},
				"v17.wav": {
					type: "file",
					content: ""
				},
				"v18.wav": {
					type: "file",
					content: ""
				},
				"v19.wav": {
					type: "file",
					content: ""
				},
				"v2.wav": {
					type: "file",
					content: ""
				},
				"v20.wav": {
					type: "file",
					content: ""
				},
				"v21.wav": {
					type: "file",
					content: ""
				},
				"v22.wav": {
					type: "file",
					content: ""
				},
				"v23.wav": {
					type: "file",
					content: ""
				},
				"v3.wav": {
					type: "file",
					content: ""
				},
				"v4.wav": {
					type: "file",
					content: ""
				},
				"v5.wav": {
					type: "file",
					content: ""
				},
				"v6.wav": {
					type: "file",
					content: ""
				},
				"v7.wav": {
					type: "file",
					content: ""
				},
				"v8.wav": {
					type: "file",
					content: ""
				},
				"v9.wav": {
					type: "file",
					content: ""
				}
			}
		}
	}
};

export default (vsf: VirtualFileSystem) => {
	vsf.setTree(treeJson as VirtualEntry);
};
