import { Request, Response } from "express";
import { resolve } from "path";
import { getCustomRepository } from "typeorm";
import { preProcessFile } from "typescript";
import { AppError } from "../errors/AppError";
import { SurveysRepository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UserRepository } from "../repositories/UsersRepository";
import SendMailService from "../services/SendMailService";

class SendMailController {
  async execute(request: Request, response: Response) {
    const { email, survey_id } = request.body;
    const surveysRepository = getCustomRepository(SurveysRepository);
    const usersRepository = getCustomRepository(UserRepository);
    const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

    const user = await usersRepository.findOne({ email });

    if (!user) {
      return response.status(400).json({
        error: "User does not exists",
      });
    }

    const survey = await surveysRepository.findOne({
      id: survey_id,
    });

    if (!survey) {
      throw new AppError("Survey does not exists.");
    }

    const userSurveryAlreadyExists = await surveysUsersRepository.findOne({
      where: { user_id: user.id, value: null },
      relations: ["user", "survey"],
    });

    const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs");
    const variables = {
      name: user.name,
      title: survey.title,
      description: survey.description,
      id: "",
      link: process.env.URL_MAIL,
    };

    if (userSurveryAlreadyExists) {
      variables.id = userSurveryAlreadyExists.id;
      await SendMailService.execute(email, survey.title, variables, npsPath);
      return response.json(userSurveryAlreadyExists);
    }

    const userSurvery = surveysUsersRepository.create({
      user_id: user.id,
      survey_id,
    });

    await surveysUsersRepository.save(userSurvery);

    variables.id = userSurveryAlreadyExists.id;

    await SendMailService.execute(email, survey.title, variables, npsPath);

    return response.json(userSurvery);
  }
}

export { SendMailController };
