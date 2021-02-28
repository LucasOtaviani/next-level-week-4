import { Request, Response } from 'express';
import { getCustomRepository } from 'typeorm';
import { SurveysRepository } from '../reposotories/SurveysRepository';
import { SurveysUsersRepository } from '../reposotories/SurveysUsersRepository';
import { UsersRepository } from '../reposotories/UsersRepository';
import SendMailService from '../services/SendMailService';
import { resolve } from 'path';
import { AppError } from '../errors/AppError';

class SendMailController {
    async handle(request: Request, response: Response) {
        const { email, survey_id } = request.body;

        const usersRepository = getCustomRepository(UsersRepository);
        const surveysRepository = getCustomRepository(SurveysRepository);
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

        const user = await usersRepository.findOne({email});

        if (!user) {
            throw new AppError("User does not exists.");
        }

        const survey = await surveysRepository.findOne({id: survey_id});

        if (!survey) {
            throw new AppError("Survey does not exists.");
        }

        const path = resolve(__dirname, "..", "views", "emails", "npsMail.hbs");

        const surveyUserAlreadyExists = await surveysUsersRepository.findOne({
            where: { 
                user_id: user.id,
                value: null,
            },
            relations: ["user", "survey"]
        });

        const variables = {
            id: "",
            name: user.name,
            title: survey.title,
            description: survey.description,
            link: process.env.URL_MAIL,
        }

        if (surveyUserAlreadyExists) {
            variables.id = surveyUserAlreadyExists.id;

            await SendMailService.sendEmail(email, survey.title, variables, path);
            return response.json(surveyUserAlreadyExists);
        }

        const surveyUser = surveysUsersRepository.create({
            user_id: user.id,
            survey_id: survey.id,
        });

        await surveysUsersRepository.save(surveyUser);
        
        variables.id = surveyUser.id;

        await SendMailService.sendEmail(email, survey.title, variables, path);

        return response.json(surveyUser);
    }
}

export { SendMailController };
